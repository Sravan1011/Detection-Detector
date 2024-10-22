import React from 'react';

const ROISelector = ({ roi, setRoi }) => {
  return (
    <div>
      <label>ROI: </label>
      <input type="number" value={roi.x} onChange={e => setRoi(prev => ({ ...prev, x: parseInt(e.target.value) }))} />
      <input type="number" value={roi.y} onChange={e => setRoi(prev => ({ ...prev, y: parseInt(e.target.value) }))} />
      <input type="number" value={roi.width} onChange={e => setRoi(prev => ({ ...prev, width: parseInt(e.target.value) }))} />
      <input type="number" value={roi.height} onChange={e => setRoi(prev => ({ ...prev, height: parseInt(e.target.value) }))} />
    </div>
  );
};

export default ROISelector;
