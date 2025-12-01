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
    id: 'shared-ip-double-attack',
    title: 'Double Attack via Shared IP',
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
      {
        id: 'device_alpha',
        type: 'other',
        label: 'Android Device',
        risk_score: 58,
        attributes: { fingerprint: 'a9:43:fe', trust: 'Low' },
        timestamp: '2024-05-02T08:40:00Z',
      },
      {
        id: 'device_bravo',
        type: 'other',
        label: 'iOS Device',
        risk_score: 62,
        attributes: { fingerprint: 'c3:11:ca', trust: 'Low' },
        timestamp: '2024-05-05T12:10:00Z',
      },
      {
        id: 'ip_exit',
        type: 'ip',
        label: '198.51.100.77',
        risk_score: 69,
        attributes: { geolocation: 'Frankfurt, DE', hosting: 'Residential proxy' },
        timestamp: '2024-05-05T14:30:00Z',
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
      {
        id: 'rel_alpha_device',
        source: 'acct_alpha',
        target: 'device_alpha',
        type: 'device',
        weight: 0.5,
        timestamp: '2024-05-02T08:50:00Z',
      },
      {
        id: 'rel_bravo_device',
        source: 'acct_bravo',
        target: 'device_bravo',
        type: 'device',
        weight: 0.5,
        timestamp: '2024-05-05T12:30:00Z',
      },
      {
        id: 'rel_proxy_exit',
        source: 'relay_edge',
        target: 'ip_exit',
        type: 'routes_to',
        weight: 0.6,
        timestamp: '2024-05-05T14:35:00Z',
      },
    ],
  },
  {
    id: 'gift-card-raids',
    title: 'Gift Card Raids via Rotating Exit',
    nodes: [
      { id: 'evt_gift_surge', type: 'event', label: 'Gift Card Surge', risk_score: 90, attributes: { region: 'CA', severity: 'High', status: 'Escalated' }, timestamp: '2024-04-18T11:00:00Z', visual: { radius: 36 } },
      { id: 'evt_coupon_farm', type: 'event', label: 'Coupon Farming', risk_score: 83, attributes: { region: 'BR', severity: 'High', status: 'Active' }, timestamp: '2024-04-18T15:00:00Z', visual: { radius: 36 } },
      { id: 'acct_delta', type: 'account', label: 'Delta Deals', risk_score: 70, attributes: { platform: 'Telegram', handle: '@deltadeals' }, timestamp: '2024-04-18T10:40:00Z' },
      { id: 'acct_echo', type: 'account', label: 'Echo Rewards', risk_score: 68, attributes: { platform: 'Discord', handle: 'echo#8871' }, timestamp: '2024-04-18T14:40:00Z' },
      { id: 'ip_gift_shared', type: 'ip', label: '198.18.0.23', risk_score: 82, attributes: { geolocation: 'Warsaw, PL', hosting: 'Compromised SOHO' }, timestamp: '2024-04-18T14:50:00Z', visual: { radius: 28 } },
      { id: 'otp_service', type: 'other', label: 'OTP Intercept Service', risk_score: 77, attributes: { provider: 'Gray Vendor' }, timestamp: '2024-04-18T14:55:00Z' },
      { id: 'gift_wallet', type: 'other', label: 'Gift Wallet', risk_score: 65, attributes: { currency: 'BTC', total_in: 5.2 }, timestamp: '2024-04-18T15:10:00Z' },
      { id: 'device_delta', type: 'other', label: 'Windows VM', risk_score: 54, attributes: { fingerprint: 'vm-992a' }, timestamp: '2024-04-18T10:35:00Z' },
      { id: 'device_echo', type: 'other', label: 'Android Tablet', risk_score: 55, attributes: { fingerprint: 'tab-b442' }, timestamp: '2024-04-18T14:35:00Z' },
      { id: 'ip_rotator', type: 'ip', label: '203.0.113.190', risk_score: 60, attributes: { geolocation: 'Paris, FR', hosting: 'Residential pool' }, timestamp: '2024-04-18T15:20:00Z' },
    ],
    links: [
      { id: 'rel_gift_delta', source: 'evt_gift_surge', target: 'acct_delta', type: 'actor_account', weight: 1, timestamp: '2024-04-18T11:05:00Z' },
      { id: 'rel_coupon_echo', source: 'evt_coupon_farm', target: 'acct_echo', type: 'actor_account', weight: 1, timestamp: '2024-04-18T15:05:00Z' },
      { id: 'rel_delta_ip', source: 'acct_delta', target: 'ip_gift_shared', type: 'login_from', weight: 0.9, timestamp: '2024-04-18T14:48:00Z' },
      { id: 'rel_echo_ip', source: 'acct_echo', target: 'ip_gift_shared', type: 'login_from', weight: 0.9, timestamp: '2024-04-18T14:52:00Z' },
      { id: 'rel_shared_otp', source: 'ip_gift_shared', target: 'otp_service', type: 'routes_to', weight: 0.6, timestamp: '2024-04-18T14:56:00Z' },
      { id: 'rel_delta_wallet', source: 'acct_delta', target: 'gift_wallet', type: 'payout', weight: 0.6, timestamp: '2024-04-18T15:12:00Z' },
      { id: 'rel_echo_wallet', source: 'acct_echo', target: 'gift_wallet', type: 'payout', weight: 0.6, timestamp: '2024-04-18T15:14:00Z' },
      { id: 'rel_delta_device', source: 'acct_delta', target: 'device_delta', type: 'device', weight: 0.5, timestamp: '2024-04-18T10:42:00Z' },
      { id: 'rel_echo_device', source: 'acct_echo', target: 'device_echo', type: 'device', weight: 0.5, timestamp: '2024-04-18T14:42:00Z' },
      { id: 'rel_rotator', source: 'ip_gift_shared', target: 'ip_rotator', type: 'routes_to', weight: 0.5, timestamp: '2024-04-18T15:22:00Z' },
    ],
  },
  {
    id: 'crypto-drain-twins',
    title: 'Crypto Drain Twins',
    nodes: [
      { id: 'evt_defi_drip', type: 'event', label: 'DeFi Drip Attack', risk_score: 91, attributes: { protocol: 'Lending', severity: 'High', status: 'Open' }, timestamp: '2024-03-11T06:00:00Z', visual: { radius: 36 } },
      { id: 'evt_nft_rug', type: 'event', label: 'NFT Rug Pull', risk_score: 87, attributes: { collection: 'PixelPets', severity: 'High', status: 'Review' }, timestamp: '2024-03-11T08:30:00Z', visual: { radius: 36 } },
      { id: 'acct_foxtrot', type: 'account', label: 'Foxtrot Labs', risk_score: 74, attributes: { platform: 'Twitter', handle: '@foxtrotlabs' }, timestamp: '2024-03-11T05:50:00Z' },
      { id: 'acct_golf', type: 'account', label: 'Golf Node', risk_score: 73, attributes: { platform: 'GitHub', handle: 'golfnode' }, timestamp: '2024-03-11T08:00:00Z' },
      { id: 'ip_chain_shared', type: 'ip', label: '10.22.33.44', risk_score: 85, attributes: { geolocation: 'Singapore', hosting: 'Cloud VM' }, timestamp: '2024-03-11T08:05:00Z', visual: { radius: 28 } },
      { id: 'mix_service', type: 'other', label: 'Mixing Service', risk_score: 78, attributes: { provider: 'MixerX' }, timestamp: '2024-03-11T08:15:00Z' },
      { id: 'bridge_contract', type: 'other', label: 'Bridge Contract', risk_score: 66, attributes: { chain: 'Polygon' }, timestamp: '2024-03-11T08:20:00Z' },
      { id: 'wallet_hot', type: 'other', label: 'Hot Wallet', risk_score: 70, attributes: { currency: 'ETH', total_in: 67 }, timestamp: '2024-03-11T08:25:00Z' },
      { id: 'device_foxtrot', type: 'other', label: 'Linux Host', risk_score: 52, attributes: { fingerprint: 'lnx-0101' }, timestamp: '2024-03-11T05:40:00Z' },
      { id: 'device_golf', type: 'other', label: 'MacOS Host', risk_score: 55, attributes: { fingerprint: 'mac-7782' }, timestamp: '2024-03-11T07:55:00Z' },
    ],
    links: [
      { id: 'rel_defi_foxtrot', source: 'evt_defi_drip', target: 'acct_foxtrot', type: 'actor_account', weight: 1, timestamp: '2024-03-11T06:05:00Z' },
      { id: 'rel_nft_golf', source: 'evt_nft_rug', target: 'acct_golf', type: 'actor_account', weight: 1, timestamp: '2024-03-11T08:35:00Z' },
      { id: 'rel_foxtrot_ip', source: 'acct_foxtrot', target: 'ip_chain_shared', type: 'login_from', weight: 0.9, timestamp: '2024-03-11T08:04:00Z' },
      { id: 'rel_golf_ip', source: 'acct_golf', target: 'ip_chain_shared', type: 'login_from', weight: 0.9, timestamp: '2024-03-11T08:06:00Z' },
      { id: 'rel_ip_mixer', source: 'ip_chain_shared', target: 'mix_service', type: 'routes_to', weight: 0.7, timestamp: '2024-03-11T08:16:00Z' },
      { id: 'rel_mixer_bridge', source: 'mix_service', target: 'bridge_contract', type: 'routes_to', weight: 0.6, timestamp: '2024-03-11T08:21:00Z' },
      { id: 'rel_bridge_wallet', source: 'bridge_contract', target: 'wallet_hot', type: 'payout', weight: 0.6, timestamp: '2024-03-11T08:26:00Z' },
      { id: 'rel_foxtrot_device', source: 'acct_foxtrot', target: 'device_foxtrot', type: 'device', weight: 0.5, timestamp: '2024-03-11T05:45:00Z' },
      { id: 'rel_golf_device', source: 'acct_golf', target: 'device_golf', type: 'device', weight: 0.5, timestamp: '2024-03-11T07:58:00Z' },
      { id: 'rel_wallet_ip', source: 'wallet_hot', target: 'ip_chain_shared', type: 'login_from', weight: 0.4, timestamp: '2024-03-11T08:27:00Z' },
    ],
  },
  {
    id: 'loan-fraud-pair',
    title: 'Loan Fraud Pair',
    nodes: [
      { id: 'evt_mortgage_rush', type: 'event', label: 'Mortgage App Rush', risk_score: 86, attributes: { region: 'US', severity: 'Medium', status: 'Active' }, timestamp: '2024-02-20T09:00:00Z', visual: { radius: 34 } },
      { id: 'evt_microloan_spree', type: 'event', label: 'Microloan Spree', risk_score: 82, attributes: { region: 'IN', severity: 'High', status: 'Active' }, timestamp: '2024-02-20T12:00:00Z', visual: { radius: 34 } },
      { id: 'acct_hotel', type: 'account', label: 'Hotel Credit', risk_score: 71, attributes: { platform: 'Android App', handle: 'hotel_credit' }, timestamp: '2024-02-20T08:55:00Z' },
      { id: 'acct_india', type: 'account', label: 'India Loans', risk_score: 69, attributes: { platform: 'Mobile Web', handle: 'india_loans' }, timestamp: '2024-02-20T11:45:00Z' },
      { id: 'ip_loan_shared', type: 'ip', label: '172.20.10.9', risk_score: 83, attributes: { geolocation: 'Bangalore, IN', hosting: '4G Hotspot' }, timestamp: '2024-02-20T12:05:00Z', visual: { radius: 28 } },
      { id: 'kyc_passport', type: 'other', label: 'Passport Template', risk_score: 75, attributes: { country: 'UK' }, timestamp: '2024-02-20T12:10:00Z' },
      { id: 'kyc_bill', type: 'other', label: 'Utility Bill', risk_score: 72, attributes: { country: 'IN' }, timestamp: '2024-02-20T12:12:00Z' },
      { id: 'device_hotspot', type: 'other', label: 'Android Hotspot', risk_score: 60, attributes: { fingerprint: 'and-3321' }, timestamp: '2024-02-20T08:50:00Z' },
      { id: 'device_router', type: 'other', label: 'Home Router', risk_score: 58, attributes: { fingerprint: 'rtr-5121' }, timestamp: '2024-02-20T11:35:00Z' },
      { id: 'ip_proxy_loan', type: 'ip', label: '203.0.113.77', risk_score: 63, attributes: { geolocation: 'London, UK', hosting: 'Residential Proxy' }, timestamp: '2024-02-20T12:20:00Z' },
    ],
    links: [
      { id: 'rel_rush_hotel', source: 'evt_mortgage_rush', target: 'acct_hotel', type: 'actor_account', weight: 1, timestamp: '2024-02-20T09:05:00Z' },
      { id: 'rel_spree_india', source: 'evt_microloan_spree', target: 'acct_india', type: 'actor_account', weight: 1, timestamp: '2024-02-20T12:05:00Z' },
      { id: 'rel_hotel_ip', source: 'acct_hotel', target: 'ip_loan_shared', type: 'login_from', weight: 0.9, timestamp: '2024-02-20T12:04:00Z' },
      { id: 'rel_india_ip', source: 'acct_india', target: 'ip_loan_shared', type: 'login_from', weight: 0.9, timestamp: '2024-02-20T12:06:00Z' },
      { id: 'rel_ip_passport', source: 'ip_loan_shared', target: 'kyc_passport', type: 'uploads', weight: 0.6, timestamp: '2024-02-20T12:11:00Z' },
      { id: 'rel_ip_bill', source: 'ip_loan_shared', target: 'kyc_bill', type: 'uploads', weight: 0.6, timestamp: '2024-02-20T12:13:00Z' },
      { id: 'rel_hotel_device', source: 'acct_hotel', target: 'device_hotspot', type: 'device', weight: 0.5, timestamp: '2024-02-20T08:58:00Z' },
      { id: 'rel_india_device', source: 'acct_india', target: 'device_router', type: 'device', weight: 0.5, timestamp: '2024-02-20T11:40:00Z' },
      { id: 'rel_proxy_chain', source: 'ip_loan_shared', target: 'ip_proxy_loan', type: 'routes_to', weight: 0.5, timestamp: '2024-02-20T12:22:00Z' },
      { id: 'rel_bill_passport', source: 'kyc_bill', target: 'kyc_passport', type: 'templates', weight: 0.4, timestamp: '2024-02-20T12:14:00Z' },
    ],
  },
  {
    id: 'travel-scam-network',
    title: 'Travel Scam Network',
    nodes: [
      { id: 'evt_ticket_rush', type: 'event', label: 'Ticketing Rush', risk_score: 88, attributes: { region: 'EU', severity: 'High', status: 'Investigating' }, timestamp: '2024-01-08T07:00:00Z', visual: { radius: 34 } },
      { id: 'evt_airfare_bait', type: 'event', label: 'Airfare Bait', risk_score: 85, attributes: { region: 'US', severity: 'Medium', status: 'Active' }, timestamp: '2024-01-08T10:30:00Z', visual: { radius: 34 } },
      { id: 'acct_juliet', type: 'account', label: 'Juliet Trips', risk_score: 73, attributes: { platform: 'Facebook', handle: 'juliet_trips' }, timestamp: '2024-01-08T06:50:00Z' },
      { id: 'acct_kilo', type: 'account', label: 'Kilo Flyers', risk_score: 71, attributes: { platform: 'Instagram', handle: '@kilofly' }, timestamp: '2024-01-08T10:10:00Z' },
      { id: 'ip_travel_shared', type: 'ip', label: '192.0.2.99', risk_score: 84, attributes: { geolocation: 'Madrid, ES', hosting: 'VPN Gateway' }, timestamp: '2024-01-08T10:20:00Z', visual: { radius: 28 } },
      { id: 'payment_hub', type: 'other', label: 'Payment Hub', risk_score: 70, attributes: { processor: 'Stripe clone' }, timestamp: '2024-01-08T10:25:00Z' },
      { id: 'crm_dump', type: 'other', label: 'CRM Dump', risk_score: 69, attributes: { records: 12000 }, timestamp: '2024-01-08T10:26:00Z' },
      { id: 'device_juliet', type: 'other', label: 'iPad Retail', risk_score: 53, attributes: { fingerprint: 'ipad-001' }, timestamp: '2024-01-08T06:45:00Z' },
      { id: 'device_kilo', type: 'other', label: 'Windows Laptop', risk_score: 56, attributes: { fingerprint: 'win-009' }, timestamp: '2024-01-08T10:05:00Z' },
      { id: 'ip_exit_travel', type: 'ip', label: '203.0.113.45', risk_score: 62, attributes: { geolocation: 'Lisbon, PT', hosting: 'Residential proxy' }, timestamp: '2024-01-08T10:40:00Z' },
    ],
    links: [
      { id: 'rel_ticket_juliet', source: 'evt_ticket_rush', target: 'acct_juliet', type: 'actor_account', weight: 1, timestamp: '2024-01-08T07:05:00Z' },
      { id: 'rel_airfare_kilo', source: 'evt_airfare_bait', target: 'acct_kilo', type: 'actor_account', weight: 1, timestamp: '2024-01-08T10:35:00Z' },
      { id: 'rel_juliet_ip', source: 'acct_juliet', target: 'ip_travel_shared', type: 'login_from', weight: 0.9, timestamp: '2024-01-08T10:22:00Z' },
      { id: 'rel_kilo_ip', source: 'acct_kilo', target: 'ip_travel_shared', type: 'login_from', weight: 0.9, timestamp: '2024-01-08T10:23:00Z' },
      { id: 'rel_ip_payment', source: 'ip_travel_shared', target: 'payment_hub', type: 'routes_to', weight: 0.6, timestamp: '2024-01-08T10:27:00Z' },
      { id: 'rel_payment_crm', source: 'payment_hub', target: 'crm_dump', type: 'routes_to', weight: 0.6, timestamp: '2024-01-08T10:28:00Z' },
      { id: 'rel_juliet_device', source: 'acct_juliet', target: 'device_juliet', type: 'device', weight: 0.5, timestamp: '2024-01-08T06:48:00Z' },
      { id: 'rel_kilo_device', source: 'acct_kilo', target: 'device_kilo', type: 'device', weight: 0.5, timestamp: '2024-01-08T10:12:00Z' },
      { id: 'rel_travel_exit', source: 'ip_travel_shared', target: 'ip_exit_travel', type: 'routes_to', weight: 0.5, timestamp: '2024-01-08T10:42:00Z' },
      { id: 'rel_crm_exit', source: 'crm_dump', target: 'ip_exit_travel', type: 'exfil', weight: 0.4, timestamp: '2024-01-08T10:44:00Z' },
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

  const [timelineValue, setTimelineValue] = useState(() => (timestamps.length ? Math.min(...timestamps) : Date.now()));
  const fgRef = useRef();
  const containerRef = useRef();

  const timeBounds = useMemo(() => {
    if (!timestamps.length) return { min: Date.now(), max: Date.now() };
    return {
      min: Math.min(...timestamps),
      max: Math.max(...timestamps),
    };
  }, [timestamps]);

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
    setTimelineValue(timestamps.length ? Math.min(...timestamps) : Date.now());

    const fg = fgRef.current;
    if (fg) {
      const linkForce = fg.d3Force('link');
      linkForce?.distance((link) => (link.type === 'actor_account' ? 180 : 140));
      const charge = fg.d3Force('charge');
      charge?.strength(-360);
    }
  }, [activeScenario, timestamps]);

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
              <p className="muted">All incidents are shown; shared infra is highlighted on focus.</p>
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
