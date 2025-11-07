import React from 'react';
import styled from 'styled-components';
import { Handle, Position } from 'reactflow';

interface TriageFlowNodeProps {
  data: {
    label: string;
    count?: number;
    metrics?: {
      ALF: number;
      SAH: number;
      DILI: number;
      HE: number;
    };
    gridSize?: number;
    type: 'triage' | 'category' | 'grid';
  };
}

const NodeContainer = styled.div<{ type: string }>`
  background: linear-gradient(135deg, #e0f2f1 0%, #b2dfdb 100%);
  border: 2px solid #4db6ac;
  border-radius: 16px;
  padding: ${props => props.type === 'triage' ? '24px' : '20px'};
  min-width: ${props => props.type === 'triage' ? '180px' : '200px'};
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  position: relative;
`;

const Title = styled.div`
  font-size: 18px;
  font-weight: 600;
  color: #00695c;
  margin-bottom: 12px;
  text-align: center;
`;

const TriageIcon = styled.div`
  font-size: 48px;
  text-align: center;
  margin: 16px 0;
`;

const Count = styled.div`
  font-size: 36px;
  font-weight: 700;
  color: #00897b;
  text-align: center;
  margin: 8px 0;
`;

const Subtitle = styled.div`
  font-size: 12px;
  color: #00695c;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
`;

const CategoryCount = styled.div`
  font-size: 48px;
  font-weight: 700;
  color: #00897b;
  text-align: center;
  margin: 8px 0;
`;

const CategorySubtitle = styled.div`
  font-size: 11px;
  color: #00695c;
  text-align: center;
  margin-top: 4px;
`;

const MetricsContainer = styled.div`
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const MetricRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  color: #00695c;
`;

const MetricLabel = styled.span`
  font-weight: 600;
`;

const MetricBar = styled.div<{ value: number; max: number }>`
  flex: 1;
  margin: 0 8px;
  height: 8px;
  background: #e0f2f1;
  border-radius: 4px;
  overflow: hidden;
  position: relative;

  &::after {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    height: 100%;
    width: ${props => (props.value / props.max) * 100}%;
    background: linear-gradient(90deg, #26a69a, #00897b);
    border-radius: 4px;
  }
`;

const GridContainer = styled.div<{ size: number }>`
  display: grid;
  grid-template-columns: repeat(${props => Math.ceil(Math.sqrt(props.size))}, 1fr);
  gap: 8px;
  margin-top: 12px;
`;

const GridSquare = styled.div<{ filled: boolean }>`
  width: 32px;
  height: 32px;
  background: ${props => props.filled ? 'linear-gradient(135deg, #26a69a, #00897b)' : '#e0f2f1'};
  border-radius: 8px;
  transition: all 0.3s ease;
  box-shadow: ${props => props.filled ? '0 2px 4px rgba(0, 0, 0, 0.2)' : 'none'};
`;

const TriageFlowNode: React.FC<TriageFlowNodeProps> = ({ data }) => {
  const { label, count, metrics, gridSize, type } = data;

  if (type === 'triage') {
    return (
      <NodeContainer type="triage">
        <Title>{label}</Title>
        <TriageIcon>📧📊</TriageIcon>
        <Count>{count?.toFixed(1)}<span style={{ fontSize: '20px' }}>k</span></Count>
        <Subtitle>
          <span>👥</span>
          <span>patients</span>
        </Subtitle>
        <Handle type="source" position={Position.Right} style={{ background: '#00897b', width: 12, height: 12 }} />
      </NodeContainer>
    );
  }

  if (type === 'category') {
    const maxMetric = metrics ? Math.max(metrics.ALF, metrics.SAH, metrics.DILI, metrics.HE) : 10;
    
    return (
      <NodeContainer type="category">
        <Handle type="target" position={Position.Left} style={{ background: '#00897b', width: 12, height: 12 }} />
        <Title>{label}</Title>
        <CategoryCount>{count}</CategoryCount>
        <CategorySubtitle>patients</CategorySubtitle>
        
        {metrics && (
          <MetricsContainer>
            <MetricRow>
              <MetricLabel>ALF</MetricLabel>
              <MetricBar value={metrics.ALF} max={maxMetric} />
              <span>{metrics.ALF}</span>
            </MetricRow>
            <MetricRow>
              <MetricLabel>SAH</MetricLabel>
              <MetricBar value={metrics.SAH} max={maxMetric} />
              <span>{metrics.SAH}</span>
            </MetricRow>
            <MetricRow>
              <MetricLabel>DILI</MetricLabel>
              <MetricBar value={metrics.DILI} max={maxMetric} />
              <span>{metrics.DILI}</span>
            </MetricRow>
            <MetricRow>
              <MetricLabel>HE</MetricLabel>
              <MetricBar value={metrics.HE} max={maxMetric} />
              <span>{metrics.HE}</span>
            </MetricRow>
          </MetricsContainer>
        )}
        
        <Handle type="source" position={Position.Right} style={{ background: '#00897b', width: 12, height: 12 }} />
      </NodeContainer>
    );
  }

  if (type === 'grid' && gridSize) {
    const totalSquares = Math.ceil(gridSize / 10) * 10; // Round up to nearest 10
    const gridCols = Math.ceil(Math.sqrt(totalSquares));
    
    return (
      <NodeContainer type="grid">
        <Handle type="target" position={Position.Left} style={{ background: '#00897b', width: 12, height: 12 }} />
        <GridContainer size={totalSquares}>
          {Array.from({ length: totalSquares }).map((_, i) => (
            <GridSquare key={i} filled={i < gridSize} />
          ))}
        </GridContainer>
      </NodeContainer>
    );
  }

  return null;
};

export default TriageFlowNode;
