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
    id: 'social-engineering-crypto-drain',
    title: 'Social Engineering Crypto Drains',
    nodes: [
      {
        id: 'evt_romance_hooks',
        type: 'event',
        label: 'Romance Hook DMs',
        risk_score: 93,
        attributes: { status: 'Active', vector: 'DM lures', platform: 'Facebook Groups' },
        timestamp: '2024-06-02T09:00:00Z',
        visual: { radius: 38 },
      },
      {
        id: 'evt_airdrop_blast',
        type: 'event',
        label: 'Airdrop Blast',
        risk_score: 88,
        attributes: { status: 'Escalated', vector: 'Fake giveaways', platform: 'Instagram Stories' },
        timestamp: '2024-06-02T12:30:00Z',
        visual: { radius: 38 },
      },
      {
        id: 'acct_fb_mentor',
        type: 'account',
        label: 'FB Mentor Persona',
        risk_score: 74,
        attributes: { platform: 'Facebook', handle: '@mentor.gains' },
        timestamp: '2024-06-02T08:55:00Z',
      },
      {
        id: 'acct_insta_coach',
        type: 'account',
        label: 'Insta Coach',
        risk_score: 72,
        attributes: { platform: 'Instagram', handle: '@altcoach' },
        timestamp: '2024-06-02T12:05:00Z',
      },
      {
        id: 'acct_support_clone',
        type: 'account',
        label: 'Support Desk Clone',
        risk_score: 68,
        attributes: { platform: 'Telegram', handle: '@helpdeskplus' },
        timestamp: '2024-06-02T12:08:00Z',
      },
      {
        id: 'ip_social_hub',
        type: 'ip',
        label: '185.199.12.44',
        risk_score: 86,
        attributes: { geolocation: 'Tallinn, EE', hosting: 'Cloud VPS' },
        timestamp: '2024-06-02T12:20:00Z',
        visual: { radius: 30 },
      },
      {
        id: 'ip_exit_social',
        type: 'ip',
        label: '203.0.113.56',
        risk_score: 65,
        attributes: { geolocation: 'Prague, CZ', hosting: 'Residential proxy' },
        timestamp: '2024-06-02T12:45:00Z',
        visual: { radius: 24 },
      },
      {
        id: 'wallet_tron_sink',
        type: 'other',
        label: 'Tron Wallet Sink',
        risk_score: 71,
        attributes: { currency: 'USDT', chain: 'Tron', total_in: 38000 },
        timestamp: '2024-06-02T12:50:00Z',
      },
      {
        id: 'landing_site',
        type: 'other',
        label: 'Promo Landing',
        risk_score: 63,
        attributes: { domain: 'promo-claim.io', ssl: 'Self-signed' },
        timestamp: '2024-06-02T12:10:00Z',
      },
      {
        id: 'device_android',
        type: 'other',
        label: 'Android Handset',
        risk_score: 55,
        attributes: { fingerprint: 'and-2f44', trust: 'Low' },
        timestamp: '2024-06-02T08:50:00Z',
      },
      {
        id: 'domain_shortener',
        type: 'other',
        label: 'Link Shortener',
        risk_score: 52,
        attributes: { provider: 'Linkly', reuse_rate: 'High' },
        timestamp: '2024-06-02T09:10:00Z',
      },
    ],
    links: [
      { id: 'rel_romance_fb', source: 'evt_romance_hooks', target: 'acct_fb_mentor', type: 'actor_account', weight: 1, timestamp: '2024-06-02T09:05:00Z' },
      { id: 'rel_airdrop_insta', source: 'evt_airdrop_blast', target: 'acct_insta_coach', type: 'actor_account', weight: 1, timestamp: '2024-06-02T12:35:00Z' },
      { id: 'rel_airdrop_support', source: 'evt_airdrop_blast', target: 'acct_support_clone', type: 'actor_account', weight: 1, timestamp: '2024-06-02T12:36:00Z' },
      { id: 'rel_fb_ip', source: 'acct_fb_mentor', target: 'ip_social_hub', type: 'login_from', weight: 0.9, timestamp: '2024-06-02T12:18:00Z' },
      { id: 'rel_insta_ip', source: 'acct_insta_coach', target: 'ip_social_hub', type: 'login_from', weight: 0.9, timestamp: '2024-06-02T12:22:00Z' },
      { id: 'rel_support_ip', source: 'acct_support_clone', target: 'ip_social_hub', type: 'login_from', weight: 0.9, timestamp: '2024-06-02T12:23:00Z' },
      { id: 'rel_ip_landing', source: 'ip_social_hub', target: 'landing_site', type: 'routes_to', weight: 0.7, timestamp: '2024-06-02T12:24:00Z' },
      { id: 'rel_landing_short', source: 'landing_site', target: 'domain_shortener', type: 'routes_to', weight: 0.6, timestamp: '2024-06-02T12:25:00Z' },
      { id: 'rel_insta_wallet', source: 'acct_insta_coach', target: 'wallet_tron_sink', type: 'payout', weight: 0.6, timestamp: '2024-06-02T12:40:00Z' },
      { id: 'rel_support_wallet', source: 'acct_support_clone', target: 'wallet_tron_sink', type: 'payout', weight: 0.6, timestamp: '2024-06-02T12:42:00Z' },
      { id: 'rel_wallet_exit', source: 'wallet_tron_sink', target: 'ip_exit_social', type: 'login_from', weight: 0.4, timestamp: '2024-06-02T12:46:00Z' },
      { id: 'rel_ip_exit_social', source: 'ip_social_hub', target: 'ip_exit_social', type: 'routes_to', weight: 0.5, timestamp: '2024-06-02T12:48:00Z' },
      { id: 'rel_fb_device', source: 'acct_fb_mentor', target: 'device_android', type: 'device', weight: 0.5, timestamp: '2024-06-02T08:57:00Z' },
    ],
  },
  {
    id: 'cross-platform-bullying-swarm',
    title: 'Cross-Platform Bullying Swarm',
    nodes: [
      {
        id: 'evt_harassment_spike',
        type: 'event',
        label: 'Harassment Spike',
        risk_score: 88,
        attributes: { topic: 'Streamer harassment', status: 'Active' },
        timestamp: '2024-05-16T18:00:00Z',
        visual: { radius: 36 },
      },
      {
        id: 'evt_doxx_drop',
        type: 'event',
        label: 'Doxx Drop Attempt',
        risk_score: 85,
        attributes: { topic: 'Personal info leak', status: 'Escalated' },
        timestamp: '2024-05-16T21:15:00Z',
        visual: { radius: 36 },
      },
      {
        id: 'acct_forum_pack',
        type: 'account',
        label: 'Forum Pack Lead',
        risk_score: 72,
        attributes: { platform: 'Imageboard', handle: 'pack_lead' },
        timestamp: '2024-05-16T17:45:00Z',
      },
      {
        id: 'acct_discord_pack',
        type: 'account',
        label: 'Discord Pack',
        risk_score: 71,
        attributes: { platform: 'Discord', handle: 'raid_room#9921' },
        timestamp: '2024-05-16T18:10:00Z',
      },
      {
        id: 'acct_throwaway',
        type: 'account',
        label: 'Throwaway Alt',
        risk_score: 64,
        attributes: { platform: 'Twitter', handle: '@newalt21' },
        timestamp: '2024-05-16T21:00:00Z',
      },
      {
        id: 'ip_raider_lan',
        type: 'ip',
        label: '198.51.100.210',
        risk_score: 83,
        attributes: { geolocation: 'Warsaw, PL', hosting: 'SOHO router' },
        timestamp: '2024-05-16T18:05:00Z',
        visual: { radius: 28 },
      },
      {
        id: 'ip_exit_bully',
        type: 'ip',
        label: '203.0.113.199',
        risk_score: 60,
        attributes: { geolocation: 'Tallinn, EE', hosting: 'Residential proxy' },
        timestamp: '2024-05-16T21:20:00Z',
        visual: { radius: 24 },
      },
      {
        id: 'content_cdn',
        type: 'other',
        label: 'Screenshot CDN',
        risk_score: 66,
        attributes: { files: 'Stolen screenshots', status: 'Live' },
        timestamp: '2024-05-16T18:20:00Z',
      },
      {
        id: 'voice_room',
        type: 'other',
        label: 'Voice Raid Room',
        risk_score: 62,
        attributes: { platform: 'Discord', occupancy: 42 },
        timestamp: '2024-05-16T18:40:00Z',
      },
      {
        id: 'device_desktop',
        type: 'other',
        label: 'Desktop Host',
        risk_score: 54,
        attributes: { fingerprint: 'desk-4421', trust: 'Low' },
        timestamp: '2024-05-16T17:40:00Z',
      },
      {
        id: 'link_paste',
        type: 'other',
        label: 'Paste Dump',
        risk_score: 58,
        attributes: { platform: 'Pastebin clone', access: 'Unlisted' },
        timestamp: '2024-05-16T21:10:00Z',
      },
    ],
    links: [
      { id: 'rel_harassment_forum', source: 'evt_harassment_spike', target: 'acct_forum_pack', type: 'actor_account', weight: 1, timestamp: '2024-05-16T18:02:00Z' },
      { id: 'rel_harassment_discord', source: 'evt_harassment_spike', target: 'acct_discord_pack', type: 'actor_account', weight: 1, timestamp: '2024-05-16T18:05:00Z' },
      { id: 'rel_doxx_throwaway', source: 'evt_doxx_drop', target: 'acct_throwaway', type: 'actor_account', weight: 1, timestamp: '2024-05-16T21:16:00Z' },
      { id: 'rel_forum_ip', source: 'acct_forum_pack', target: 'ip_raider_lan', type: 'login_from', weight: 0.9, timestamp: '2024-05-16T18:07:00Z' },
      { id: 'rel_discord_ip', source: 'acct_discord_pack', target: 'ip_raider_lan', type: 'login_from', weight: 0.9, timestamp: '2024-05-16T18:11:00Z' },
      { id: 'rel_throwaway_ip', source: 'acct_throwaway', target: 'ip_raider_lan', type: 'login_from', weight: 0.9, timestamp: '2024-05-16T21:12:00Z' },
      { id: 'rel_ip_cdn', source: 'ip_raider_lan', target: 'content_cdn', type: 'exfil', weight: 0.6, timestamp: '2024-05-16T18:22:00Z' },
      { id: 'rel_cdn_paste', source: 'content_cdn', target: 'link_paste', type: 'routes_to', weight: 0.6, timestamp: '2024-05-16T21:11:00Z' },
      { id: 'rel_ip_voice', source: 'ip_raider_lan', target: 'voice_room', type: 'routes_to', weight: 0.6, timestamp: '2024-05-16T18:41:00Z' },
      { id: 'rel_forum_device', source: 'acct_forum_pack', target: 'device_desktop', type: 'device', weight: 0.5, timestamp: '2024-05-16T17:47:00Z' },
      { id: 'rel_ip_exit_bully', source: 'ip_raider_lan', target: 'ip_exit_bully', type: 'routes_to', weight: 0.5, timestamp: '2024-05-16T21:21:00Z' },
      { id: 'rel_paste_exit', source: 'link_paste', target: 'ip_exit_bully', type: 'exfil', weight: 0.4, timestamp: '2024-05-16T21:23:00Z' },
    ],
  },
  {
    id: 'child-safety-sting',
    title: 'Child Safety Sting Operation',
    nodes: [
      {
        id: 'evt_grooming_ping',
        type: 'event',
        label: 'Grooming Alert',
        risk_score: 90,
        attributes: { status: 'Escalated', source: 'Safety hotline' },
        timestamp: '2024-04-09T07:30:00Z',
        visual: { radius: 36 },
      },
      {
        id: 'evt_illicit_media_tip',
        type: 'event',
        label: 'Illicit Media Tip',
        risk_score: 87,
        attributes: { status: 'Actioned', source: 'NGO referral' },
        timestamp: '2024-04-09T10:00:00Z',
        visual: { radius: 36 },
      },
      {
        id: 'acct_messaging_alias',
        type: 'account',
        label: 'Messaging Alias',
        risk_score: 75,
        attributes: { platform: 'Encrypted chat', handle: '@mentor_alt' },
        timestamp: '2024-04-09T07:10:00Z',
      },
      {
        id: 'acct_market_mod',
        type: 'account',
        label: 'Closed Forum Mod',
        risk_score: 73,
        attributes: { platform: 'Closed forum', handle: 'market_mod' },
        timestamp: '2024-04-09T09:40:00Z',
      },
      {
        id: 'acct_delivery_bot',
        type: 'account',
        label: 'Delivery Bot',
        risk_score: 68,
        attributes: { platform: 'File bot', handle: '@kid-guard' },
        timestamp: '2024-04-09T09:50:00Z',
      },
      {
        id: 'ip_hidden_hub',
        type: 'ip',
        label: '203.0.113.88',
        risk_score: 86,
        attributes: { geolocation: 'Frankfurt, DE', hosting: 'Bulletproof VPS' },
        timestamp: '2024-04-09T09:45:00Z',
        visual: { radius: 28 },
      },
      {
        id: 'ip_residential_cover',
        type: 'ip',
        label: '198.51.100.44',
        risk_score: 64,
        attributes: { geolocation: 'Paris, FR', hosting: 'Residential proxy' },
        timestamp: '2024-04-09T10:05:00Z',
        visual: { radius: 24 },
      },
      {
        id: 'storage_node',
        type: 'other',
        label: 'Cloud Vault',
        risk_score: 72,
        attributes: { provider: 'Object store', files: 'Flagged zips' },
        timestamp: '2024-04-09T09:47:00Z',
      },
      {
        id: 'handoff_room',
        type: 'other',
        label: 'Handoff Room',
        risk_score: 63,
        attributes: { platform: 'IRC bridge', visibility: 'Invite-only' },
        timestamp: '2024-04-09T07:40:00Z',
      },
      {
        id: 'device_tablet',
        type: 'other',
        label: 'Android Tablet',
        risk_score: 55,
        attributes: { fingerprint: 'tab-9002', trust: 'Low' },
        timestamp: '2024-04-09T07:05:00Z',
      },
      {
        id: 'monitor_casefile',
        type: 'other',
        label: 'Casefile Link',
        risk_score: 52,
        attributes: { system: 'Casework', status: 'Tracking' },
        timestamp: '2024-04-09T10:10:00Z',
      },
    ],
    links: [
      { id: 'rel_grooming_alias', source: 'evt_grooming_ping', target: 'acct_messaging_alias', type: 'actor_account', weight: 1, timestamp: '2024-04-09T07:32:00Z' },
      { id: 'rel_tip_market', source: 'evt_illicit_media_tip', target: 'acct_market_mod', type: 'actor_account', weight: 1, timestamp: '2024-04-09T10:02:00Z' },
      { id: 'rel_tip_delivery', source: 'evt_illicit_media_tip', target: 'acct_delivery_bot', type: 'actor_account', weight: 1, timestamp: '2024-04-09T10:03:00Z' },
      { id: 'rel_alias_ip', source: 'acct_messaging_alias', target: 'ip_hidden_hub', type: 'login_from', weight: 0.9, timestamp: '2024-04-09T09:42:00Z' },
      { id: 'rel_market_ip', source: 'acct_market_mod', target: 'ip_hidden_hub', type: 'login_from', weight: 0.9, timestamp: '2024-04-09T09:44:00Z' },
      { id: 'rel_delivery_ip', source: 'acct_delivery_bot', target: 'ip_hidden_hub', type: 'login_from', weight: 0.9, timestamp: '2024-04-09T09:46:00Z' },
      { id: 'rel_ip_storage', source: 'ip_hidden_hub', target: 'storage_node', type: 'routes_to', weight: 0.7, timestamp: '2024-04-09T09:48:00Z' },
      { id: 'rel_storage_cover', source: 'storage_node', target: 'ip_residential_cover', type: 'routes_to', weight: 0.6, timestamp: '2024-04-09T10:06:00Z' },
      { id: 'rel_alias_handoff', source: 'acct_messaging_alias', target: 'handoff_room', type: 'routes_to', weight: 0.5, timestamp: '2024-04-09T07:41:00Z' },
      { id: 'rel_alias_device', source: 'acct_messaging_alias', target: 'device_tablet', type: 'device', weight: 0.5, timestamp: '2024-04-09T07:12:00Z' },
      { id: 'rel_casefile_cover', source: 'monitor_casefile', target: 'ip_residential_cover', type: 'routes_to', weight: 0.4, timestamp: '2024-04-09T10:12:00Z' },
    ],
  },
  {
    id: 'extremist-community-push',
    title: 'Extremist Community Push',
    nodes: [
      {
        id: 'evt_incel_raid_call',
        type: 'event',
        label: 'Raid Call',
        risk_score: 89,
        attributes: { status: 'Coordinated', theme: 'Raid planning' },
        timestamp: '2024-03-12T15:00:00Z',
        visual: { radius: 34 },
      },
      {
        id: 'evt_cross_platform_push',
        type: 'event',
        label: 'Cross-Platform Push',
        risk_score: 84,
        attributes: { status: 'Live', theme: 'Cross-post drive' },
        timestamp: '2024-03-12T17:20:00Z',
        visual: { radius: 34 },
      },
      {
        id: 'acct_board_host',
        type: 'account',
        label: 'Board Host',
        risk_score: 74,
        attributes: { platform: 'Forum', handle: 'iron_mask' },
        timestamp: '2024-03-12T14:50:00Z',
      },
      {
        id: 'acct_stream_speaker',
        type: 'account',
        label: 'Stream Speaker',
        risk_score: 73,
        attributes: { platform: 'Streaming', handle: 'redpillradio' },
        timestamp: '2024-03-12T17:00:00Z',
      },
      {
        id: 'acct_alt_mod',
        type: 'account',
        label: 'Alt Mod',
        risk_score: 68,
        attributes: { platform: 'Chat server', handle: 'mod_404' },
        timestamp: '2024-03-12T17:05:00Z',
      },
      {
        id: 'ip_us_gateway',
        type: 'ip',
        label: '192.0.2.211',
        risk_score: 85,
        attributes: { geolocation: 'Denver, US', hosting: 'Cloud gateway' },
        timestamp: '2024-03-12T17:10:00Z',
        visual: { radius: 28 },
      },
      {
        id: 'ip_exit_mirror',
        type: 'ip',
        label: '198.51.100.12',
        risk_score: 63,
        attributes: { geolocation: 'Riga, LV', hosting: 'Residential proxy' },
        timestamp: '2024-03-12T17:30:00Z',
        visual: { radius: 24 },
      },
      {
        id: 'content_mirror',
        type: 'other',
        label: 'Mirror Site',
        risk_score: 69,
        attributes: { domain: 'mirror-shift.net', status: 'Live' },
        timestamp: '2024-03-12T17:12:00Z',
      },
      {
        id: 'tipjar_wallet',
        type: 'other',
        label: 'Tip Jar Wallet',
        risk_score: 66,
        attributes: { currency: 'BTC', total_in: 3.4 },
        timestamp: '2024-03-12T17:25:00Z',
      },
      {
        id: 'device_laptop',
        type: 'other',
        label: 'Laptop Host',
        risk_score: 56,
        attributes: { fingerprint: 'lap-331a', trust: 'Low' },
        timestamp: '2024-03-12T14:45:00Z',
      },
      {
        id: 'voice_channel',
        type: 'other',
        label: 'Voice Briefing',
        risk_score: 60,
        attributes: { platform: 'Mumble', occupancy: 18 },
        timestamp: '2024-03-12T15:10:00Z',
      },
      {
        id: 'playlist_archive',
        type: 'other',
        label: 'Clip Archive',
        risk_score: 58,
        attributes: { platform: 'Video drive', items: 42 },
        timestamp: '2024-03-12T17:28:00Z',
      },
    ],
    links: [
      { id: 'rel_raid_board', source: 'evt_incel_raid_call', target: 'acct_board_host', type: 'actor_account', weight: 1, timestamp: '2024-03-12T15:02:00Z' },
      { id: 'rel_raid_altmod', source: 'evt_incel_raid_call', target: 'acct_alt_mod', type: 'actor_account', weight: 1, timestamp: '2024-03-12T15:05:00Z' },
      { id: 'rel_push_stream', source: 'evt_cross_platform_push', target: 'acct_stream_speaker', type: 'actor_account', weight: 1, timestamp: '2024-03-12T17:22:00Z' },
      { id: 'rel_board_ip', source: 'acct_board_host', target: 'ip_us_gateway', type: 'login_from', weight: 0.9, timestamp: '2024-03-12T17:11:00Z' },
      { id: 'rel_stream_ip', source: 'acct_stream_speaker', target: 'ip_us_gateway', type: 'login_from', weight: 0.9, timestamp: '2024-03-12T17:13:00Z' },
      { id: 'rel_alt_ip', source: 'acct_alt_mod', target: 'ip_us_gateway', type: 'login_from', weight: 0.9, timestamp: '2024-03-12T17:14:00Z' },
      { id: 'rel_ip_mirror', source: 'ip_us_gateway', target: 'content_mirror', type: 'routes_to', weight: 0.7, timestamp: '2024-03-12T17:15:00Z' },
      { id: 'rel_mirror_exit', source: 'content_mirror', target: 'ip_exit_mirror', type: 'routes_to', weight: 0.5, timestamp: '2024-03-12T17:31:00Z' },
      { id: 'rel_ip_tipjar', source: 'ip_us_gateway', target: 'tipjar_wallet', type: 'payout', weight: 0.6, timestamp: '2024-03-12T17:26:00Z' },
      { id: 'rel_tipjar_exit', source: 'tipjar_wallet', target: 'ip_exit_mirror', type: 'login_from', weight: 0.4, timestamp: '2024-03-12T17:32:00Z' },
      { id: 'rel_board_device', source: 'acct_board_host', target: 'device_laptop', type: 'device', weight: 0.5, timestamp: '2024-03-12T14:52:00Z' },
      { id: 'rel_ip_voice', source: 'ip_us_gateway', target: 'voice_channel', type: 'routes_to', weight: 0.6, timestamp: '2024-03-12T15:12:00Z' },
      { id: 'rel_voice_archive', source: 'voice_channel', target: 'playlist_archive', type: 'routes_to', weight: 0.4, timestamp: '2024-03-12T17:29:00Z' },
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
    if (eventTimestamps.length) {
      return { min: Math.min(...eventTimestamps), max: Math.max(...eventTimestamps) };
    }
    if (timestamps.length) {
      return { min: Math.min(...timestamps), max: Math.max(...timestamps) };
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
