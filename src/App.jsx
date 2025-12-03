import React, { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { format } from './utils/date';

const typeGlyphs = {
  event: 'EV',
  ip: 'IP',
  account: 'AC',
  other: 'AUX',
};

const typeLabels = {
  event: 'Events',
  ip: 'IP Addresses',
  account: 'Accounts',
  other: 'Other',
};

const typePalette = {
  event: { fill: '#FFF4F4', ring: '#FCDADA', glyph: '#D33F3F' },
  ip: { fill: '#F3F8FF', ring: '#C8DBFD', glyph: '#1C3FAA' },
  account: { fill: '#F3FFFB', ring: '#B9F4E1', glyph: '#0F9D58' },
  other: { fill: '#FFF9EE', ring: '#F6D9A7', glyph: '#C56A00' },
};

const typeOrder = ['event', 'ip', 'account', 'other'];

const parseTimestamp = (value) => {
  const ts = Date.parse(value || '');
  return Number.isFinite(ts) ? ts : null;
};

const riskColor = (score) => {
  if (score >= 80) return '#D33F3F';
  if (score >= 50) return '#E9A23B';
  return '#1D9C73';
};

const syntheticScenarios = [
  {
    id: 'crypto-scam-telegram',
    title: 'Flagged Crypto Drain via Telegram',
    nodes: [
      {
        id: 'evt_tg_lure',
        type: 'event',
        label: 'Telegram Lure DM',
        risk_score: 94,
        attributes: { status: 'Flagged', vector: 'Direct message', platform: 'Telegram' },
        timestamp: '2024-08-02T14:00:00Z',
        visual: { radius: 38 },
      },
      {
        id: 'evt_link_follow',
        type: 'event',
        label: 'Victim Clicked Link',
        risk_score: 90,
        attributes: { status: 'Escalated', action: 'Link opened', device: 'Mobile' },
        timestamp: '2024-08-02T14:11:00Z',
        visual: { radius: 36 },
      },
      {
        id: 'acct_tg_actor',
        type: 'account',
        label: 'TG Support Clone',
        risk_score: 82,
        attributes: { platform: 'Telegram', handle: '@support-fastpay' },
        timestamp: '2024-08-02T13:50:00Z',
      },
      {
        id: 'acct_exchange',
        type: 'account',
        label: 'Exchange Hand-off',
        risk_score: 70,
        attributes: { platform: 'CeFi exchange', handle: 'helpdesk-payout' },
        timestamp: '2024-08-02T14:22:00Z',
      },
      {
        id: 'acct_victim_wallet',
        type: 'account',
        label: 'Victim Wallet',
        risk_score: 65,
        attributes: { chain: 'ETH', address: '0x9c8...4ae' },
        timestamp: '2024-08-02T14:12:00Z',
      },
      {
        id: 'ip_phish_gateway',
        type: 'ip',
        label: '185.199.20.42',
        risk_score: 88,
        attributes: { geolocation: 'Tallinn, EE', hosting: 'VPS', role: 'Phishing gateway' },
        timestamp: '2024-08-02T14:05:00Z',
        visual: { radius: 30 },
      },
      {
        id: 'ip_exit_resi',
        type: 'ip',
        label: '203.0.113.210',
        risk_score: 67,
        attributes: { geolocation: 'Lisbon, PT', hosting: 'Residential proxy' },
        timestamp: '2024-08-02T14:25:00Z',
        visual: { radius: 24 },
      },
      {
        id: 'landing_clone',
        type: 'other',
        label: 'Exchange Landing',
        risk_score: 74,
        attributes: { domain: 'fastpay-help.center', ssl: 'Self-signed' },
        timestamp: '2024-08-02T14:06:00Z',
      },
      {
        id: 'short_link',
        type: 'other',
        label: 'Shortened URL',
        risk_score: 60,
        attributes: { provider: 'Link.ly', reuse_rate: 'High' },
        timestamp: '2024-08-02T14:03:00Z',
      },
      {
        id: 'wallet_sink',
        type: 'other',
        label: 'Hot Wallet Sink',
        risk_score: 80,
        attributes: { chain: 'ETH', total_in: 52000 },
        timestamp: '2024-08-02T14:23:00Z',
      },
      {
        id: 'device_android',
        type: 'other',
        label: 'Android Device',
        risk_score: 55,
        attributes: { fingerprint: 'and-44af', trust: 'Low' },
        timestamp: '2024-08-02T13:48:00Z',
      },
    ],
    links: [
      { id: 'rel_dm_actor', source: 'evt_tg_lure', target: 'acct_tg_actor', type: 'actor_account', weight: 1, timestamp: '2024-08-02T14:01:00Z' },
      { id: 'rel_dm_short', source: 'evt_tg_lure', target: 'short_link', type: 'routes_to', weight: 0.8, timestamp: '2024-08-02T14:02:00Z' },
      { id: 'rel_short_landing', source: 'short_link', target: 'landing_clone', type: 'routes_to', weight: 0.7, timestamp: '2024-08-02T14:04:00Z' },
      { id: 'rel_landing_gateway', source: 'landing_clone', target: 'ip_phish_gateway', type: 'routes_to', weight: 0.8, timestamp: '2024-08-02T14:06:30Z' },
      { id: 'rel_actor_ip', source: 'acct_tg_actor', target: 'ip_phish_gateway', type: 'login_from', weight: 0.9, timestamp: '2024-08-02T14:07:00Z' },
      { id: 'rel_click_wallet', source: 'evt_link_follow', target: 'acct_victim_wallet', type: 'actor_account', weight: 1, timestamp: '2024-08-02T14:12:20Z' },
      { id: 'rel_wallet_sink', source: 'acct_victim_wallet', target: 'wallet_sink', type: 'payout', weight: 0.7, timestamp: '2024-08-02T14:22:20Z' },
      { id: 'rel_sink_exit', source: 'wallet_sink', target: 'ip_exit_resi', type: 'login_from', weight: 0.6, timestamp: '2024-08-02T14:24:00Z' },
      { id: 'rel_exchange_sink', source: 'acct_exchange', target: 'wallet_sink', type: 'payout', weight: 0.5, timestamp: '2024-08-02T14:23:30Z' },
      { id: 'rel_gateway_exchange', source: 'ip_phish_gateway', target: 'acct_exchange', type: 'routes_to', weight: 0.6, timestamp: '2024-08-02T14:21:00Z' },
      { id: 'rel_actor_device', source: 'acct_tg_actor', target: 'device_android', type: 'device', weight: 0.5, timestamp: '2024-08-02T13:52:00Z' },
    ],
  },
  {
    id: 'child-exploitation-attempt',
    title: 'Attempted Child Exploitation Outreach',
    nodes: [
      {
        id: 'evt_fake_friend_request',
        type: 'event',
        label: 'Fake Friend Request',
        risk_score: 91,
        attributes: { status: 'Flagged', platform: 'Facebook', vector: 'Messenger' },
        timestamp: '2024-07-15T19:05:00Z',
        visual: { radius: 36 },
      },
      {
        id: 'evt_illicit_media_push',
        type: 'event',
        label: 'Illicit Media Push',
        risk_score: 89,
        attributes: { status: 'Escalated', payload: 'Image drop', target: 'Protected minor' },
        timestamp: '2024-07-15T19:16:00Z',
        visual: { radius: 36 },
      },
      {
        id: 'acct_fake_fb',
        type: 'account',
        label: 'Fake FB Mentor',
        risk_score: 78,
        attributes: { platform: 'Facebook', handle: 'mentor.support' },
        timestamp: '2024-07-15T18:50:00Z',
      },
      {
        id: 'acct_file_drop',
        type: 'account',
        label: 'File Drop Bot',
        risk_score: 69,
        attributes: { platform: 'File bot', handle: '@drop-send' },
        timestamp: '2024-07-15T19:12:00Z',
      },
      {
        id: 'acct_casefile',
        type: 'account',
        label: 'Case Monitor',
        risk_score: 62,
        attributes: { platform: 'Investigation', handle: 'case-4411' },
        timestamp: '2024-07-15T19:25:00Z',
      },
      {
        id: 'ip_proxy_bridge',
        type: 'ip',
        label: '198.51.100.90',
        risk_score: 86,
        attributes: { geolocation: 'Frankfurt, DE', hosting: 'Proxy bridge' },
        timestamp: '2024-07-15T19:00:00Z',
        visual: { radius: 28 },
      },
      {
        id: 'ip_exit_cover',
        type: 'ip',
        label: '203.0.113.14',
        risk_score: 64,
        attributes: { geolocation: 'Prague, CZ', hosting: 'Residential exit' },
        timestamp: '2024-07-15T19:24:00Z',
        visual: { radius: 24 },
      },
      {
        id: 'handoff_forum',
        type: 'other',
        label: 'Hidden Forum Thread',
        risk_score: 72,
        attributes: { platform: 'Closed forum', visibility: 'Invite-only' },
        timestamp: '2024-07-15T18:55:00Z',
      },
      {
        id: 'storage_vault',
        type: 'other',
        label: 'Cloud Vault',
        risk_score: 75,
        attributes: { provider: 'Object store', files: 'Flagged media' },
        timestamp: '2024-07-15T19:14:00Z',
      },
      {
        id: 'device_tablet',
        type: 'other',
        label: 'Android Tablet',
        risk_score: 55,
        attributes: { fingerprint: 'tab-1144', trust: 'Low' },
        timestamp: '2024-07-15T18:48:00Z',
      },
    ],
    links: [
      { id: 'rel_fb_actor', source: 'evt_fake_friend_request', target: 'acct_fake_fb', type: 'actor_account', weight: 1, timestamp: '2024-07-15T19:06:00Z' },
      { id: 'rel_fb_proxy', source: 'acct_fake_fb', target: 'ip_proxy_bridge', type: 'login_from', weight: 0.9, timestamp: '2024-07-15T19:01:00Z' },
      { id: 'rel_proxy_forum', source: 'ip_proxy_bridge', target: 'handoff_forum', type: 'routes_to', weight: 0.7, timestamp: '2024-07-15T19:02:00Z' },
      { id: 'rel_forum_bot', source: 'handoff_forum', target: 'acct_file_drop', type: 'actor_account', weight: 0.8, timestamp: '2024-07-15T19:12:30Z' },
      { id: 'rel_bot_storage', source: 'acct_file_drop', target: 'storage_vault', type: 'routes_to', weight: 0.7, timestamp: '2024-07-15T19:14:20Z' },
      { id: 'rel_storage_exit', source: 'storage_vault', target: 'ip_exit_cover', type: 'routes_to', weight: 0.6, timestamp: '2024-07-15T19:24:30Z' },
      { id: 'rel_event_storage', source: 'evt_illicit_media_push', target: 'storage_vault', type: 'exfil', weight: 0.6, timestamp: '2024-07-15T19:17:00Z' },
      { id: 'rel_case_exit', source: 'acct_casefile', target: 'ip_exit_cover', type: 'routes_to', weight: 0.5, timestamp: '2024-07-15T19:25:30Z' },
      { id: 'rel_fb_device', source: 'acct_fake_fb', target: 'device_tablet', type: 'device', weight: 0.5, timestamp: '2024-07-15T18:52:00Z' },
    ],
  },
  {
    id: 'impersonation-phishing',
    title: 'Close-Friend Impersonation Phish',
    nodes: [
      {
        id: 'evt_friend_lookup',
        type: 'event',
        label: 'Friend Graph Lookup',
        risk_score: 83,
        attributes: { status: 'Flagged', source: 'Graph scan', target: 'VIP contact list' },
        timestamp: '2024-06-11T10:05:00Z',
        visual: { radius: 32 },
      },
      {
        id: 'evt_phish_launch',
        type: 'event',
        label: 'Phishing Launch',
        risk_score: 92,
        attributes: { status: 'Live', payload: 'Lookalike profile', goal: 'Credential theft' },
        timestamp: '2024-06-11T10:32:00Z',
        visual: { radius: 36 },
      },
      {
        id: 'acct_friend_real',
        type: 'account',
        label: 'Real Friend Profile',
        risk_score: 60,
        attributes: { platform: 'Instagram', handle: '@katie.real' },
        timestamp: '2024-06-11T09:50:00Z',
      },
      {
        id: 'acct_bot_scraper',
        type: 'account',
        label: 'Scraper Bot',
        risk_score: 77,
        attributes: { platform: 'Automation', handle: 'scrape-bot-22' },
        timestamp: '2024-06-11T10:00:00Z',
      },
      {
        id: 'acct_phish_clone',
        type: 'account',
        label: 'Lookalike Phish',
        risk_score: 88,
        attributes: { platform: 'Instagram', handle: '@katie_rea1' },
        timestamp: '2024-06-11T10:28:00Z',
      },
      {
        id: 'acct_victim',
        type: 'account',
        label: 'Protected Client',
        risk_score: 72,
        attributes: { platform: 'Instagram', handle: '@client_vip' },
        timestamp: '2024-06-11T10:30:00Z',
      },
      {
        id: 'ip_clone_gateway',
        type: 'ip',
        label: '192.0.2.88',
        risk_score: 84,
        attributes: { geolocation: 'Denver, US', hosting: 'Cloud clone host' },
        timestamp: '2024-06-11T10:15:00Z',
        visual: { radius: 28 },
      },
      {
        id: 'ip_exit_mask',
        type: 'ip',
        label: '198.51.100.33',
        risk_score: 66,
        attributes: { geolocation: 'Warsaw, PL', hosting: 'Residential mask' },
        timestamp: '2024-06-11T10:35:00Z',
        visual: { radius: 24 },
      },
      {
        id: 'content_phish_page',
        type: 'other',
        label: 'Phishing Page',
        risk_score: 78,
        attributes: { domain: 'insta-verif.help', cert: 'Mismatch' },
        timestamp: '2024-06-11T10:20:00Z',
      },
      {
        id: 'device_laptop',
        type: 'other',
        label: 'Laptop Host',
        risk_score: 56,
        attributes: { fingerprint: 'lap-411c', trust: 'Low' },
        timestamp: '2024-06-11T09:48:00Z',
      },
      {
        id: 'signal_thread',
        type: 'other',
        label: 'Signal Thread',
        risk_score: 62,
        attributes: { channel: 'Signal', topic: 'Phish coordination' },
        timestamp: '2024-06-11T10:10:00Z',
      },
    ],
    links: [
      { id: 'rel_lookup_scraper', source: 'evt_friend_lookup', target: 'acct_bot_scraper', type: 'actor_account', weight: 1, timestamp: '2024-06-11T10:06:00Z' },
      { id: 'rel_scraper_real', source: 'acct_bot_scraper', target: 'acct_friend_real', type: 'routes_to', weight: 0.7, timestamp: '2024-06-11T10:07:00Z' },
      { id: 'rel_scraper_signal', source: 'acct_bot_scraper', target: 'signal_thread', type: 'routes_to', weight: 0.6, timestamp: '2024-06-11T10:10:30Z' },
      { id: 'rel_signal_clone', source: 'signal_thread', target: 'acct_phish_clone', type: 'actor_account', weight: 0.8, timestamp: '2024-06-11T10:27:00Z' },
      { id: 'rel_clone_ip', source: 'acct_phish_clone', target: 'ip_clone_gateway', type: 'login_from', weight: 0.9, timestamp: '2024-06-11T10:28:30Z' },
      { id: 'rel_ip_phish', source: 'ip_clone_gateway', target: 'content_phish_page', type: 'routes_to', weight: 0.8, timestamp: '2024-06-11T10:21:00Z' },
      { id: 'rel_phish_launch', source: 'evt_phish_launch', target: 'content_phish_page', type: 'routes_to', weight: 0.9, timestamp: '2024-06-11T10:32:30Z' },
      { id: 'rel_phish_victim', source: 'content_phish_page', target: 'acct_victim', type: 'actor_account', weight: 0.8, timestamp: '2024-06-11T10:33:00Z' },
      { id: 'rel_victim_exit', source: 'acct_victim', target: 'ip_exit_mask', type: 'login_from', weight: 0.6, timestamp: '2024-06-11T10:35:30Z' },
      { id: 'rel_clone_device', source: 'acct_phish_clone', target: 'device_laptop', type: 'device', weight: 0.5, timestamp: '2024-06-11T09:49:00Z' },
    ],
  },
];


const filtersInitialState = Object.keys(typeLabels).reduce((acc, key) => {
  acc[key] = true;
  return acc;
}, {});

const buildAdjacency = (links) => {
  const graph = new Map();
  links.forEach((link) => {
    const { source, target } = link;
    if (!graph.has(source)) graph.set(source, new Set());
    if (!graph.has(target)) graph.set(target, new Set());
    graph.get(source).add(target);
    graph.get(target).add(source);
  });
  return graph;
};

const sortNodesByTypeAndTime = (nodes) => {
  const priority = typeOrder.reduce((acc, type, idx) => {
    acc[type] = idx;
    return acc;
  }, {});

  return nodes.slice().sort((a, b) => {
    const typeDiff = (priority[a.type] ?? 99) - (priority[b.type] ?? 99);
    if (typeDiff !== 0) return typeDiff;

    const aTime = Date.parse(a.timestamp || '');
    const bTime = Date.parse(b.timestamp || '');
    if (Number.isFinite(aTime) && Number.isFinite(bTime)) return aTime - bTime;
    if (Number.isFinite(aTime)) return -1;
    if (Number.isFinite(bTime)) return 1;
    return a.label.localeCompare(b.label);
  });
};

const withAlpha = (hex, alpha) => {
  const sanitized = hex.replace('#', '');
  const bigint = parseInt(sanitized, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const validateSyntheticData = (data) => {
  const events = data.nodes.filter((n) => n.type === 'event');
  if (events.length < 2) {
    return {
      code: 'EVENT_COUNT',
      message: 'Synthetic data must include at least two event nodes.',
    };
  }

  const ipNodes = data.nodes.filter((n) => n.type === 'ip');
  if (ipNodes.length === 0) {
    return {
      code: 'IP_MISSING',
      message: 'Synthetic data must include a scam IP address.',
    };
  }

  const adjacency = buildAdjacency(data.links);

  const canReach = (start, target) => {
    const seen = new Set();
    const queue = [start];
    while (queue.length) {
      const current = queue.shift();
      if (current === target) return true;
      if (seen.has(current)) continue;
      seen.add(current);
      adjacency.get(current)?.forEach((neighbor) => {
        if (!seen.has(neighbor)) queue.push(neighbor);
      });
    }
    return false;
  };

  const sharedIp = ipNodes.find((ip) => events.every((evt) => canReach(evt.id, ip.id)));

  if (!sharedIp) {
    return {
      code: 'SHARED_IP_MISSING',
      message: 'The two events must both link to a single shared scam IP address.',
      details: {
        eventIds: events.map((e) => e.id),
        availableIpNodes: ipNodes.map((ip) => ip.id),
      },
    };
  }

  return null;
};

const resolveId = (endpoint) => (typeof endpoint === 'object' && endpoint !== null ? endpoint.id : endpoint);

function App() {
  const [scenarioId, setScenarioId] = useState(syntheticScenarios[0].id);
  const activeScenario = useMemo(
    () => syntheticScenarios.find((scenario) => scenario.id === scenarioId) || syntheticScenarios[0],
    [scenarioId]
  );

  const adjacency = useMemo(() => buildAdjacency(activeScenario.links), [activeScenario]);
  const degreeMap = useMemo(() => {
    const counts = new Map();
    activeScenario.links.forEach((link) => {
      const src = resolveId(link.source);
      const tgt = resolveId(link.target);
      counts.set(src, (counts.get(src) || 0) + 1);
      counts.set(tgt, (counts.get(tgt) || 0) + 1);
    });
    return counts;
  }, [activeScenario]);

  const nodeImportance = useMemo(() => {
    const importance = new Map();
    activeScenario.nodes.forEach((node) => {
      const connectivity = degreeMap.get(node.id) || 0;
      const risk = node.risk_score ?? 0;
      const baseRadius = node.visual?.radius || 18;
      const sizeBoost = (risk / 100) * 12 + Math.min(connectivity * 2.4, 18);
      importance.set(node.id, baseRadius + sizeBoost);
    });
    return importance;
  }, [activeScenario, degreeMap]);
  const [activeFilters, setActiveFilters] = useState(filtersInitialState);
  const [selectedNode, setSelectedNode] = useState(null);
  const [hoverNode, setHoverNode] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [dimensions, setDimensions] = useState({ width: 960, height: 440 });
  const [visibleNodes, setVisibleNodes] = useState(() => new Set(activeScenario.nodes.map((n) => n.id)));

  const timestamps = useMemo(() => {
    const fromNodes = activeScenario.nodes.map((n) => Date.parse(n.timestamp)).filter(Number.isFinite);
    const fromLinks = activeScenario.links.map((l) => Date.parse(l.timestamp)).filter(Number.isFinite);
    const times = [...fromNodes, ...fromLinks];
    return times;
  }, [activeScenario]);

  const eventTimestamps = useMemo(
    () => activeScenario.nodes.filter((n) => n.type === 'event').map((n) => parseTimestamp(n.timestamp)).filter(Number.isFinite),
    [activeScenario]
  );

  const [timelineValue, setTimelineValue] = useState(() => {
    const initialEvents = syntheticScenarios[0].nodes
      .filter((n) => n.type === 'event')
      .map((n) => parseTimestamp(n.timestamp))
      .filter(Number.isFinite);
    if (initialEvents.length) return Math.min(...initialEvents);
    const initialTimes = [
      ...syntheticScenarios[0].nodes.map((n) => parseTimestamp(n.timestamp)).filter(Number.isFinite),
      ...syntheticScenarios[0].links.map((l) => parseTimestamp(l.timestamp)).filter(Number.isFinite),
    ];
    return initialTimes.length ? Math.min(...initialTimes) : Date.now();
  });
  const fgRef = useRef();
  const containerRef = useRef();

  const timeBounds = useMemo(() => {
    const allTimes = timestamps.length ? timestamps : eventTimestamps;
    if (allTimes.length) {
      const min = Math.min(...allTimes);
      const max = Math.max(...allTimes);
      return { min, max };
    }
    const now = Date.now();
    return { min: now, max: now };
  }, [eventTimestamps, timestamps]);

  const timelineProgression = useMemo(() => {
    const nodeTimes = new Map();
    activeScenario.nodes.forEach((node) => nodeTimes.set(node.id, parseTimestamp(node.timestamp)));

    const earliestIpTime = Math.min(
      ...activeScenario.nodes.filter((n) => n.type === 'ip').map((n) => parseTimestamp(n.timestamp) || Infinity),
      Infinity
    );
    const earliestNodes = activeScenario.nodes.filter((n) => (n.type === 'ip' ? parseTimestamp(n.timestamp) === earliestIpTime : false));
    const globalEarliest = Math.min(...timestamps, Infinity);
    const fallbackOrigins = activeScenario.nodes.filter((n) => parseTimestamp(n.timestamp) === globalEarliest);
    const origins = (earliestNodes.length ? earliestNodes : fallbackOrigins).map((n) => n.id);
    const seedOrigins = origins.length ? origins : activeScenario.nodes.slice(0, 1).map((n) => n.id);

    const linksByNode = new Map();
    activeScenario.links.forEach((link) => {
      const src = resolveId(link.source);
      const tgt = resolveId(link.target);
      const linkTime = parseTimestamp(link.timestamp);
      const push = (nodeId, neighbor) => {
        if (!linksByNode.has(nodeId)) linksByNode.set(nodeId, []);
        linksByNode.get(nodeId).push({ id: link.id, neighbor, time: linkTime });
      };
      push(src, tgt);
      push(tgt, src);
    });

    const reachableNodes = new Set(seedOrigins);
    const reachableLinks = new Set();
    const queue = [...seedOrigins];

    while (queue.length) {
      const current = queue.shift();
      linksByNode.get(current)?.forEach(({ id, neighbor, time }) => {
        const withinTime = time === null || time <= timelineValue;
        const neighborTime = nodeTimes.get(neighbor);
        const neighborVisible = neighborTime === null || neighborTime <= timelineValue;
        if (withinTime && neighborVisible) {
          reachableLinks.add(id);
          if (!reachableNodes.has(neighbor)) {
            reachableNodes.add(neighbor);
            queue.push(neighbor);
          }
        }
      });
    }

    return { origins: new Set(seedOrigins), nodes: reachableNodes, links: reachableLinks };
  }, [activeScenario, timelineValue, timestamps]);

  const dataError = useMemo(() => validateSyntheticData(activeScenario), [activeScenario]);

  const resetView = () => {
    setVisibleNodes(new Set(activeScenario.nodes.map((n) => n.id)));
    setSelectedNode(null);
    setHoverNode(null);
    setTimelineValue(timeBounds.min);
    if (fgRef.current?.zoomToFit) fgRef.current.zoomToFit(400, 60);
  };

  const revealConnectedComponent = useCallback(
    (nodeId) => {
      const seen = new Set();
      const queue = [nodeId];
      while (queue.length) {
        const current = queue.shift();
        if (seen.has(current)) continue;
        seen.add(current);
        const neighbors = adjacency.get(current);
        neighbors?.forEach((neighbor) => {
          if (!seen.has(neighbor)) queue.push(neighbor);
        });
      }
      return seen;
    },
    [adjacency]
  );

  const revealDirectNeighbors = useCallback(
    (nodeId) => {
      const direct = new Set(adjacency.get(nodeId) || []);
      direct.add(nodeId);
      return direct;
    },
    [adjacency]
  );

  useEffect(() => {
    const fg = fgRef.current;
    if (fg && fg.zoomToFit) {
      const timer = setTimeout(() => fg.zoomToFit(400, 60), 200);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, []);

  useEffect(() => {
    setVisibleNodes(new Set(activeScenario.nodes.map((n) => n.id)));
    setSelectedNode(null);
    setHoverNode(null);
    setTimelineValue(timeBounds.min);

    const fg = fgRef.current;
    if (fg) {
      const linkForce = fg.d3Force('link');
      linkForce?.distance((link) => (link.type === 'actor_account' ? 180 : 140));
      const charge = fg.d3Force('charge');
      charge?.strength(-360);
    }
  }, [activeScenario, timeBounds]);

  useEffect(() => {
    const updateSize = () => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) setDimensions({ width: rect.width, height: rect.height });
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const toggleFilter = (type) => {
    setActiveFilters((prev) => ({ ...prev, [type]: !prev[type] }));
  };

  const handleNodeClick = (node) => {
    setSelectedNode(node);
    const scope = revealConnectedComponent(node.id);
    setVisibleNodes((prev) => {
      const expanded = new Set(activeScenario.nodes.map((n) => n.id));
      scope.forEach((id) => expanded.add(id));
      return expanded;
    });
  };

  const handleNodeDoubleClick = (node) => {
    setVisibleNodes((prev) => {
      const expanded = new Set(prev);
      revealDirectNeighbors(node.id).forEach((id) => expanded.add(id));
      return expanded;
    });
  };

  const filteredHighlight = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return new Set();
    return new Set(
      activeScenario.nodes
        .filter((n) => n.label.toLowerCase().includes(term) || n.id.toLowerCase().includes(term))
        .map((n) => n.id)
    );
  }, [searchTerm, activeScenario]);

  const visibleData = useMemo(() => {
    const nodes = sortNodesByTypeAndTime(
      activeScenario.nodes.filter((n) => visibleNodes.has(n.id) && activeFilters[n.type])
    );
    const allowedIds = new Set(nodes.map((n) => n.id));
    const links = activeScenario.links.filter(
      (link) => allowedIds.has(resolveId(link.source)) && allowedIds.has(resolveId(link.target))
    );
    return { nodes, links };
  }, [visibleNodes, activeFilters, activeScenario]);

  const activeFocus = useMemo(() => {
    if (hoverNode) return revealDirectNeighbors(hoverNode.id);
    if (selectedNode) return revealConnectedComponent(selectedNode.id);
    return null;
  }, [hoverNode, selectedNode, revealConnectedComponent, revealDirectNeighbors]);

  const nodeCanvasObject = (node, ctx, globalScale) => {
    const palette = typePalette[node.type] || { fill: '#F8FAFD', ring: '#C3CAD8', glyph: '#1B1D21' };
    const importanceRadius = nodeImportance.get(node.id) || node.visual?.radius || 18;
    const radius = importanceRadius / Math.sqrt(globalScale);
    const label = node.label;

    let alpha = 1;
    const inTimeline = timelineProgression.nodes.has(node.id);
    if (!inTimeline) alpha *= 0.1;

    const time = parseTimestamp(node.timestamp);
    if (time !== null && time > timelineValue) alpha *= 0.16;

    if (filteredHighlight.size && !filteredHighlight.has(node.id)) {
      alpha *= 0.35;
    }

    if (activeFocus && !activeFocus.has(node.id)) {
      alpha *= 0.25;
    }

    ctx.save();
    ctx.globalAlpha = alpha;

    const ringWidth = node.id === selectedNode?.id ? 4 : 2;
    ctx.beginPath();
    if (node.type === 'ip') {
      ctx.setLineDash([5, 4]);
    } else if (node.type === 'event') {
      ctx.setLineDash([2, 2]);
    }
    ctx.lineWidth = ringWidth;
    ctx.strokeStyle = palette.ring;
    ctx.fillStyle = palette.fill;
    ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false);
    ctx.fill();
    ctx.stroke();
    ctx.setLineDash([]);

    if (timelineProgression.origins.has(node.id)) {
      ctx.beginPath();
      ctx.lineWidth = 5;
      ctx.strokeStyle = withAlpha('#2D4ED7', 0.35);
      ctx.arc(node.x, node.y, radius + 6, 0, 2 * Math.PI, false);
      ctx.stroke();
    }

    ctx.fillStyle = palette.glyph;
    ctx.font = `${10 / Math.sqrt(globalScale)}px "Inter", system-ui`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(typeGlyphs[node.type] || 'ID', node.x, node.y - radius - 10);

    ctx.fillStyle = '#0F172A';
    ctx.font = `${12 / Math.sqrt(globalScale)}px "Inter", system-ui`;
    ctx.fillText(label, node.x, node.y);

    ctx.restore();
  };

  const isEdgeHighlighted = (link) => {
    const src = resolveId(link.source);
    const tgt = resolveId(link.target);
    const hoverId = hoverNode?.id;
    const selectedId = selectedNode?.id;
    return (
      (hoverId && (src === hoverId || tgt === hoverId)) || (selectedId && (src === selectedId || tgt === selectedId))
    );
  };

  const linkColor = (link) => {
    const emphasized = isEdgeHighlighted(link);
    const inTimeline = timelineProgression.links.has(link.id);
    const recent = Number.isFinite(Date.parse(link.timestamp)) && Date.parse(link.timestamp) <= timelineValue;
    if (!inTimeline) return withAlpha('#9AAAF5', 0.12);
    if (emphasized) return withAlpha('#375DFB', 0.95);
    return withAlpha('#375DFB', recent ? 0.45 : 0.25);
  };

  const linkWidth = (link) => {
    if (!timelineProgression.links.has(link.id)) return 0.7;
    if (isEdgeHighlighted(link)) return 2.8;
    return link.weight >= 0.9 ? 2.1 : 1.4;
  };

  const renderTooltip = () => {
    const node = hoverNode || selectedNode;
    if (!node) return null;

    const attrEntries = Object.entries(node.attributes || {});
    const degree = adjacency.get(node.id)?.size || 0;
    const seenAt = parseTimestamp(node.timestamp);
    const timelineStatus =
      seenAt === null ? 'No timestamp' : seenAt <= timelineValue ? 'Visible in current slice' : 'Future in timeline';

    return (
      <div className="tooltip">
        <div className="tooltip__title">{node.label}</div>
        <div className="tooltip__meta">
          <span className="pill pill--ghost">{typeLabels[node.type] || node.type}</span>
          <span className="pill" style={{ backgroundColor: `${riskColor(node.risk_score)}1A`, color: riskColor(node.risk_score) }}>
            Risk {node.risk_score ?? '–'}
          </span>
        </div>
        <div className="tooltip__grid">
          <div className="tooltip__row">
            <span className="tooltip__label">Node ID</span>
            <span className="tooltip__value">{node.id}</span>
          </div>
          <div className="tooltip__row">
            <span className="tooltip__label">Connections</span>
            <span className="tooltip__value">{degree}</span>
          </div>
          <div className="tooltip__row">
            <span className="tooltip__label">Timeline</span>
            <span className="tooltip__value">{timelineStatus}</span>
          </div>
        </div>
        {attrEntries.length > 0 && (
          <div className="tooltip__grid">
            {attrEntries.slice(0, 6).map(([key, value]) => (
              <div key={key} className="tooltip__row">
                <span className="tooltip__label">{key}</span>
                <span className="tooltip__value">{String(value)}</span>
              </div>
            ))}
          </div>
        )}
        {node.timestamp && <div className="tooltip__timestamp">Seen: {format(node.timestamp)}</div>}
      </div>
    );
  };

  return (
    <div className="page">
      <header className="page__header">
        <div>
          <p className="eyebrow">Flagged Case Dashboard</p>
          <h1>Synapse Chart</h1>
          <p className="lede">
            Visualize captured incidents from the safety stack. Slide through time to replay how each flagged case unfolded and
            inspect the infrastructure binding actors, devices, and pivots.
          </p>
        </div>
        <button className="btn" onClick={resetView}>
          Reset Synapse View
        </button>
      </header>

      {dataError && (
        <div className="error-banner">
          <div>
            <p className="strong">Synthetic data error</p>
            <p className="muted">{dataError.message}</p>
          </div>
          <pre className="error-banner__code">{JSON.stringify(dataError, null, 2)}</pre>
        </div>
      )}

      <div className="card">
        <div className="card__controls">
          <div className="controls__left">
            <div className="scenario-select">
              <label htmlFor="scenario">Scenario</label>
              <select id="scenario" value={scenarioId} onChange={(e) => setScenarioId(e.target.value)}>
                {syntheticScenarios.map((scenario) => (
                  <option key={scenario.id} value={scenario.id}>
                    {scenario.title}
                  </option>
                ))}
              </select>
              <p className="muted">Flagged incidents captured for the Synapse demo; focus highlights the shared infrastructure.</p>
            </div>
            <div className="filters">
              {Object.entries(typeLabels).map(([type, label]) => (
                <button
                  key={type}
                  className={`pill ${activeFilters[type] ? 'pill--active' : 'pill--ghost'}`}
                  onClick={() => toggleFilter(type)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="controls__right">
            <div className="search">
              <input
                type="search"
                placeholder="Search nodes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="timeline">
              <label>Over time</label>
              <input
                type="range"
                min={timeBounds.min}
                max={timeBounds.max}
                step={60 * 1000}
                value={timelineValue}
                onChange={(e) => setTimelineValue(Number(e.target.value))}
              />
              <div className="timeline__ticks">
                <span>{format(timeBounds.min)}</span>
                <span>{format(timelineValue)}</span>
                <span>{format(timeBounds.max)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="graph-container" ref={containerRef}>
          <ForceGraph2D
            ref={fgRef}
            graphData={visibleData}
            width={dimensions.width}
            height={dimensions.height}
            nodeRelSize={8}
            linkWidth={linkWidth}
            linkColor={linkColor}
            linkDirectionalParticles={(link) => (link.weight >= 0.9 || isEdgeHighlighted(link) ? 2 : 0)}
            linkDirectionalParticleWidth={2}
            linkLineDash={(link) => (link.weight < 0.6 ? [6, 4] : undefined)}
            nodeLabel={() => ''}
            onNodeClick={handleNodeClick}
            onNodeHover={setHoverNode}
            onNodeDragEnd={(node) => {
              node.fx = node.x;
              node.fy = node.y;
            }}
            onNodeRightClick={() => setSelectedNode(null)}
            onNodeDoubleClick={handleNodeDoubleClick}
            nodeCanvasObject={nodeCanvasObject}
            enableZoomPanInteraction
            cooldownTicks={60}
            d3VelocityDecay={0.15}
          />
          {renderTooltip()}
        </div>
      </div>

      <section className="details">
        <div className="details__header">
          <h2>Node Details</h2>
          <p>Click a node to inspect attributes, risk, and timeline context.</p>
        </div>
        {selectedNode ? (
          <div className="details__panel">
            <div className="details__title">
              <div className="details__avatar" style={{ borderColor: riskColor(selectedNode.risk_score || 0) }}>
                {typeGlyphs[selectedNode.type]}
              </div>
              <div>
                <p className="eyebrow">{typeLabels[selectedNode.type] || selectedNode.type}</p>
                <h3>{selectedNode.label}</h3>
                <p className="muted">Risk score {selectedNode.risk_score ?? '–'}</p>
              </div>
            </div>
            <div className="details__grid">
              {Object.entries(selectedNode.attributes || {}).map(([key, value]) => (
                <div key={key} className="details__item">
                  <p className="muted">{key}</p>
                  <p className="strong">{String(value)}</p>
                </div>
              ))}
            </div>
            {selectedNode.timestamp && <div className="muted">Last seen: {format(selectedNode.timestamp)}</div>}
            <div className="details__actions">
              <button className="btn btn--ghost" onClick={() => handleNodeDoubleClick(selectedNode)}>
                Expand neighbors
              </button>
              <button className="btn" onClick={() => setSelectedNode(null)}>
                Clear selection
              </button>
            </div>
          </div>
        ) : (
          <div className="details__empty">Select any node to view contextual metadata.</div>
        )}
      </section>
    </div>
  );
}

export default App;
