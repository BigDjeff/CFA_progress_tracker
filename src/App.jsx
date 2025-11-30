import React, { useMemo, useRef, useState, useEffect } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { format } from './utils/date';

const typeIcons = {
  event: '⚡',
  person: '👤',
  device: '📱',
  network: '🌐',
  media: '🎞️',
};

const typeLabels = {
  event: 'Events',
  person: 'People',
  device: 'Devices',
  network: 'Networks',
  media: 'Media',
};

const riskColor = (score) => {
  if (score >= 80) return '#FF754C';
  if (score >= 50) return '#F2C94C';
  return '#33D69F';
};

const baseData = {
  nodes: [
    {
      id: 'evt_root',
      type: 'event',
      label: 'Harassment Campaign #4',
      risk_score: 95,
      attributes: { status: 'Active', detected_at: '2023-10-27T10:00:00Z' },
      timestamp: '2023-10-27T10:00:00Z',
      visual: { radius: 40 },
    },
    {
      id: 'usr_a',
      type: 'person',
      label: 'Scammer Account A',
      risk_score: 88,
      attributes: {
        platform: 'Instagram',
        username: '@bad_actor',
        account_age_days: 2,
      },
      timestamp: '2023-10-27T09:55:00Z',
    },
    {
      id: 'dev_iphone',
      type: 'device',
      label: "Grandma's iPhone",
      risk_score: 10,
      attributes: { model: 'iPhone 13', os: 'iOS 16.4' },
      timestamp: '2023-10-27T10:06:00Z',
    },
    {
      id: 'ip_45',
      type: 'network',
      label: '45.22.11.12',
      risk_score: 75,
      attributes: { geolocation: 'Lagos, NG', is_vpn: true },
      timestamp: '2023-10-27T09:55:00Z',
    },
    {
      id: 'media_clip',
      type: 'media',
      label: 'Instagram Reel',
      risk_score: 55,
      attributes: { duration: '1:10', reported: '4x' },
      timestamp: '2023-10-27T10:10:00Z',
    },
  ],
  links: [
    {
      id: 'rel_1',
      source: 'usr_a',
      target: 'evt_root',
      type: 'initiated',
      weight: 1,
      timestamp: '2023-10-27T10:05:00Z',
    },
    {
      id: 'rel_2',
      source: 'evt_root',
      target: 'dev_iphone',
      type: 'targeted',
      weight: 1,
      timestamp: '2023-10-27T10:06:00Z',
    },
    {
      id: 'rel_3',
      source: 'usr_a',
      target: 'ip_45',
      type: 'logged_in_from',
      weight: 0.5,
      timestamp: '2023-10-27T09:55:00Z',
    },
    {
      id: 'rel_4',
      source: 'evt_root',
      target: 'media_clip',
      type: 'shared_media',
      weight: 0.3,
      timestamp: '2023-10-27T10:10:00Z',
    },
  ],
};

const hiddenNeighborMap = {
  usr_a: {
    nodes: [
      {
        id: 'usr_b',
        type: 'person',
        label: 'Botnet Helper',
        risk_score: 62,
        attributes: { platform: 'Telegram', username: '@helper_bot' },
        timestamp: '2023-10-27T09:50:00Z',
      },
      {
        id: 'ip_91',
        type: 'network',
        label: '91.200.10.34',
        risk_score: 48,
        attributes: { geolocation: 'Klaipeda, LT', is_vpn: false },
        timestamp: '2023-10-27T09:45:00Z',
      },
    ],
    links: [
      {
        id: 'rel_5',
        source: 'usr_a',
        target: 'usr_b',
        type: 'coordinated_with',
        weight: 0.6,
        timestamp: '2023-10-27T09:51:00Z',
      },
      {
        id: 'rel_6',
        source: 'usr_b',
        target: 'ip_91',
        type: 'posted_from',
        weight: 0.4,
        timestamp: '2023-10-27T09:46:00Z',
      },
    ],
  },
  dev_iphone: {
    nodes: [
      {
        id: 'media_album',
        type: 'media',
        label: 'Camera Roll Dump',
        risk_score: 20,
        attributes: { count: 8, sensitive: false },
        timestamp: '2023-10-27T10:07:00Z',
      },
    ],
    links: [
      {
        id: 'rel_7',
        source: 'dev_iphone',
        target: 'media_album',
        type: 'synced_to',
        weight: 0.2,
        timestamp: '2023-10-27T10:07:00Z',
      },
    ],
  },
};

const filtersInitialState = Object.keys(typeLabels).reduce((acc, key) => {
  acc[key] = true;
  return acc;
}, {});

function App() {
  const [graphData, setGraphData] = useState(baseData);
  const [activeFilters, setActiveFilters] = useState(filtersInitialState);
  const [selectedNode, setSelectedNode] = useState(null);
  const [hoverNode, setHoverNode] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [timelineValue, setTimelineValue] = useState(() =>
    new Date(baseData.nodes.reduce((min, n) => Math.min(min, Date.parse(n.timestamp)), Infinity)).getTime()
  );
  const [dimensions, setDimensions] = useState({ width: 960, height: 440 });
  const fgRef = useRef();
  const containerRef = useRef();

  const timeBounds = useMemo(() => {
    const timestamps = graphData.links
      .map((l) => Date.parse(l.timestamp))
      .filter((t) => Number.isFinite(t));
    return {
      min: Math.min(...timestamps),
      max: Math.max(...timestamps),
    };
  }, [graphData.links]);

  const visibleData = useMemo(() => {
    const cutoff = timelineValue;
    const filteredNodes = graphData.nodes.filter((node) => activeFilters[node.type]);
    const visibleNodeIds = new Set(filteredNodes.map((n) => n.id));

    const filteredLinks = graphData.links.filter((link) => {
      const t = Date.parse(link.timestamp);
      return (
        Number.isFinite(t) &&
        t >= cutoff &&
        visibleNodeIds.has(link.source) &&
        visibleNodeIds.has(link.target)
      );
    });

    const nodesUsed = new Set();
    filteredLinks.forEach((link) => {
      nodesUsed.add(link.source);
      nodesUsed.add(link.target);
    });

    const nodes = filteredNodes.filter((n) => nodesUsed.has(n.id) || n.id === 'evt_root');

    return { nodes, links: filteredLinks };
  }, [graphData, activeFilters, timelineValue]);

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
  };

  const handleNodeDoubleClick = (node) => {
    if (!hiddenNeighborMap[node.id]) return;

    setGraphData((prev) => {
      const additions = hiddenNeighborMap[node.id];
      const existingIds = new Set(prev.nodes.map((n) => n.id));
      const existingLinkIds = new Set(prev.links.map((l) => l.id));

      const nodes = [
        ...prev.nodes,
        ...additions.nodes.filter((n) => !existingIds.has(n.id)),
      ];
      const links = [
        ...prev.links,
        ...additions.links.filter((l) => !existingLinkIds.has(l.id)),
      ];
      return { nodes, links };
    });
  };

  const nodeCanvasObject = (node, ctx, globalScale) => {
    if (filteredHighlight.size && !filteredHighlight.has(node.id)) {
      ctx.globalAlpha = 0.25;
    }

    const radius = (node.visual?.radius || 18) / Math.sqrt(globalScale);
    const border = node.id === selectedNode?.id ? 4 : 2;
    const label = `${typeIcons[node.type] || '•'} ${node.label}`;

    ctx.beginPath();
    ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.lineWidth = border;
    ctx.strokeStyle = node.id === selectedNode?.id ? '#6C5DD3' : riskColor(node.risk_score || 0);
    ctx.stroke();
    ctx.shadowColor = 'rgba(0,0,0,0.12)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 2;
    ctx.font = `${12 / Math.sqrt(globalScale)}px Inter, system-ui`;
    ctx.fillStyle = '#1B1D21';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, node.x, node.y);
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  };

  const edgeColor = (link) => {
    const target = graphData.nodes.find((n) => n.id === link.target);
    if (target?.risk_score >= 80 || link.weight >= 0.9) return '#FF754C';
    return '#E4E4E4';
  };

  const filteredHighlight = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return new Set();
    return new Set(
      graphData.nodes
        .filter((n) => n.label.toLowerCase().includes(term) || n.id.toLowerCase().includes(term))
        .map((n) => n.id)
    );
  }, [graphData.nodes, searchTerm]);

  const renderTooltip = () => {
    const node = hoverNode || selectedNode;
    if (!node) return null;

    const attrEntries = Object.entries(node.attributes || {});

    return (
      <div className="tooltip">
        <div className="tooltip__title">{node.label}</div>
        <div className="tooltip__meta">
          <span className="pill pill--ghost">{typeLabels[node.type] || node.type}</span>
          <span className="pill" style={{ backgroundColor: `${riskColor(node.risk_score)}33`, color: riskColor(node.risk_score) }}>
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
          <p className="eyebrow">Priority</p>
          <h1>Priority Event Synapse</h1>
          <p className="lede">
            Explore and expand the network for an event. Filters, timeline, and double-click expansion mirror the
            planned Synapse Chart behavior.
          </p>
        </div>
        <button
          className="btn"
          onClick={() => {
            setGraphData(baseData);
            setSelectedNode(null);
            setTimelineValue(timeBounds.min);
            if (fgRef.current?.zoomToFit) fgRef.current.zoomToFit(400, 60);
          }}
        >
          Event Overview
        </button>
      </header>

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
            linkWidth={(link) => (link.weight >= 0.9 ? 2.5 : 1.5)}
            linkColor={(link) => edgeColor(link)}
            linkDirectionalParticles={(link) => (link.weight >= 0.9 ? 2 : 0)}
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
                {typeIcons[selectedNode.type]}
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
            {selectedNode.timestamp && (
              <div className="muted">Last seen: {format(selectedNode.timestamp)}</div>
            )}
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
