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

const typeOrder = ['event', 'ip', 'account', 'other'];

const riskColor = (score) => {
  if (score >= 80) return '#D33F3F';
  if (score >= 50) return '#E9A23B';
  return '#1D9C73';
};

const syntheticData = {
  nodes: [
    {
      id: 'evt_card_wave',
      type: 'event',
      label: 'Card Testing Wave',
      risk_score: 92,
      attributes: { status: 'Active', severity: 'High', region: 'UK' },
      timestamp: '2024-05-02T09:00:00Z',
      visual: { radius: 38 },
    },
    {
      id: 'evt_invest_blast',
      type: 'event',
      label: 'Investment Lure Blast',
      risk_score: 88,
      attributes: { status: 'Active', severity: 'High', region: 'US' },
      timestamp: '2024-05-05T14:00:00Z',
      visual: { radius: 38 },
    },
    {
      id: 'acct_alpha',
      type: 'account',
      label: 'Alpha Cashout',
      risk_score: 76,
      attributes: { platform: 'Instagram', handle: '@cash.alpha', age_days: 3 },
      timestamp: '2024-05-02T08:45:00Z',
    },
    {
      id: 'acct_bravo',
      type: 'account',
      label: 'Bravo Holdings',
      risk_score: 72,
      attributes: { platform: 'TikTok', handle: '@bravo.hld', age_days: 4 },
      timestamp: '2024-05-05T12:25:00Z',
    },
    {
      id: 'ip_shared',
      type: 'ip',
      label: '203.0.113.24',
      risk_score: 84,
      attributes: { geolocation: 'Amsterdam, NL', hosting: 'VPS - Exit Node' },
      timestamp: '2024-05-05T13:40:00Z',
      visual: { radius: 30 },
    },
    {
      id: 'relay_edge',
      type: 'other',
      label: 'Proxy Relay',
      risk_score: 64,
      attributes: { provider: 'Unregistered ASN', role: 'Traffic Broker' },
      timestamp: '2024-05-05T13:45:00Z',
    },
    {
      id: 'wallet_sink',
      type: 'other',
      label: 'Payout Wallet',
      risk_score: 71,
      attributes: { currency: 'USDT', chain: 'Tron', total_in: 24000 },
      timestamp: '2024-05-05T14:10:00Z',
    },
  ],
  links: [
    {
      id: 'rel_evt_alpha',
      source: 'evt_card_wave',
      target: 'acct_alpha',
      type: 'actor_account',
      weight: 1,
      timestamp: '2024-05-02T09:05:00Z',
    },
    {
      id: 'rel_evt_bravo',
      source: 'evt_invest_blast',
      target: 'acct_bravo',
      type: 'actor_account',
      weight: 1,
      timestamp: '2024-05-05T14:05:00Z',
    },
    {
      id: 'rel_alpha_ip',
      source: 'acct_alpha',
      target: 'ip_shared',
      type: 'login_from',
      weight: 0.9,
      timestamp: '2024-05-05T12:00:00Z',
    },
    {
      id: 'rel_bravo_ip',
      source: 'acct_bravo',
      target: 'ip_shared',
      type: 'login_from',
      weight: 0.9,
      timestamp: '2024-05-05T14:15:00Z',
    },
    {
      id: 'rel_ip_proxy',
      source: 'ip_shared',
      target: 'relay_edge',
      type: 'routes_to',
      weight: 0.7,
      timestamp: '2024-05-05T13:48:00Z',
    },
    {
      id: 'rel_alpha_wallet',
      source: 'acct_alpha',
      target: 'wallet_sink',
      type: 'payout',
      weight: 0.6,
      timestamp: '2024-05-05T14:20:00Z',
    },
    {
      id: 'rel_bravo_wallet',
      source: 'acct_bravo',
      target: 'wallet_sink',
      type: 'payout',
      weight: 0.6,
      timestamp: '2024-05-05T14:22:00Z',
    },
  ],
};

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
  const sharedIp = ipNodes.find((ip) => events.every((evt) => adjacency.get(evt.id)?.has(ip.id)));

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
  const adjacency = useMemo(() => buildAdjacency(syntheticData.links), []);
  const [activeFilters, setActiveFilters] = useState(filtersInitialState);
  const [selectedNode, setSelectedNode] = useState(null);
  const [hoverNode, setHoverNode] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [dimensions, setDimensions] = useState({ width: 960, height: 440 });
  const [visibleNodes, setVisibleNodes] = useState(() =>
    new Set(syntheticData.nodes.filter((n) => n.type === 'event').map((n) => n.id))
  );

  const timestamps = useMemo(() => {
    const fromNodes = syntheticData.nodes.map((n) => Date.parse(n.timestamp)).filter(Number.isFinite);
    const fromLinks = syntheticData.links.map((l) => Date.parse(l.timestamp)).filter(Number.isFinite);
    const times = [...fromNodes, ...fromLinks];
    return times;
  }, []);

  const [timelineValue, setTimelineValue] = useState(() => Math.min(...timestamps));
  const fgRef = useRef();
  const containerRef = useRef();

  const timeBounds = useMemo(() => {
    return {
      min: Math.min(...timestamps),
      max: Math.max(...timestamps),
    };
  }, [timestamps]);

  const dataError = useMemo(() => validateSyntheticData(syntheticData), []);

  const resetView = () => {
    setVisibleNodes(new Set(syntheticData.nodes.filter((n) => n.type === 'event').map((n) => n.id)));
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
    setVisibleNodes(scope);
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
      syntheticData.nodes
        .filter((n) => n.label.toLowerCase().includes(term) || n.id.toLowerCase().includes(term))
        .map((n) => n.id)
    );
  }, [searchTerm]);

  const visibleData = useMemo(() => {
    const nodes = sortNodesByTypeAndTime(
      syntheticData.nodes.filter((n) => visibleNodes.has(n.id) && activeFilters[n.type])
    );
    const allowedIds = new Set(nodes.map((n) => n.id));
    const links = syntheticData.links.filter(
      (link) => allowedIds.has(resolveId(link.source)) && allowedIds.has(resolveId(link.target))
    );
    return { nodes, links };
  }, [visibleNodes, activeFilters]);

  const activeFocus = useMemo(() => {
    if (hoverNode) return revealDirectNeighbors(hoverNode.id);
    if (selectedNode) return revealConnectedComponent(selectedNode.id);
    return null;
  }, [hoverNode, selectedNode, revealConnectedComponent, revealDirectNeighbors]);

  const nodeCanvasObject = (node, ctx, globalScale) => {
    if (filteredHighlight.size && !filteredHighlight.has(node.id)) {
      ctx.globalAlpha = 0.2;
    }

    if (activeFocus && !activeFocus.has(node.id)) {
      ctx.globalAlpha *= 0.35;
    }

    const radius = (node.visual?.radius || 18) / Math.sqrt(globalScale);
    const stroke = node.id === selectedNode?.id ? '#2D4ED7' : '#C3CAD8';
    const baseFill = '#F8FAFD';
    const label = node.label;

    const time = Date.parse(node.timestamp || '');
    const faded = Number.isFinite(time) && time < timelineValue;
    if (faded) ctx.globalAlpha *= 0.55;

    ctx.beginPath();
    ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false);
    ctx.fillStyle = baseFill;
    ctx.fill();
    ctx.lineWidth = node.id === selectedNode?.id ? 4 : 2;
    ctx.strokeStyle = stroke;
    ctx.stroke();

    ctx.fillStyle = riskColor(node.risk_score || 0);
    ctx.font = `${10 / Math.sqrt(globalScale)}px "Inter", system-ui`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(typeGlyphs[node.type] || 'ID', node.x, node.y - radius - 10);

    ctx.fillStyle = '#1B1D21';
    ctx.font = `${12 / Math.sqrt(globalScale)}px "Inter", system-ui`;
    ctx.fillText(label, node.x, node.y);

    ctx.globalAlpha = 1;
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
    const recent = Number.isFinite(Date.parse(link.timestamp)) && Date.parse(link.timestamp) >= timelineValue;
    if (emphasized) return '#375DFB';
    if (recent) return '#9AAAF5';
    return '#CDD5E4';
  };

  const linkWidth = (link) => {
    if (isEdgeHighlighted(link)) return 2.8;
    return link.weight >= 0.9 ? 2.1 : 1.4;
  };

  const renderTooltip = () => {
    const node = hoverNode || selectedNode;
    if (!node) return null;

    const attrEntries = Object.entries(node.attributes || {});

    return (
      <div className="tooltip">
        <div className="tooltip__title">{node.label}</div>
        <div className="tooltip__meta">
          <span className="pill pill--ghost">{typeLabels[node.type] || node.type}</span>
          <span className="pill" style={{ backgroundColor: `${riskColor(node.risk_score)}1A`, color: riskColor(node.risk_score) }}>
            Risk {node.risk_score ?? '–'}
          </span>
        </div>
        {attrEntries.length > 0 && (
          <div className="tooltip__grid">
            {attrEntries.slice(0, 4).map(([key, value]) => (
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
          <p className="eyebrow">Investigation</p>
          <h1>Connection Intelligence</h1>
          <p className="lede">
            Inspect coordinated events sharing infrastructure. Use the timeline, filters, and neighbor expansion to surface
            linked assets without losing critical context.
          </p>
        </div>
        <button className="btn" onClick={resetView}>
          Event Overview
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
