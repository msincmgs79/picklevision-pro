'use client';

import { useState } from 'react';

export default function Home() {
    const [step, setStep] = useState(1);

  return (
        <div style={{ minHeight: '100vh', background: '#667eea', padding: '40px', fontFamily: 'Arial' }}>
                <div style={{ maxWidth: '1000px', margin: '0 auto', background: 'white', padding: '40px', borderRadius: '8px' }}>
                          <h1 style={{ margin: '0 0 20px 0', color: '#333' }}>PickleVision</h1>h1>
                          <p style={{ margin: '0 0 20px 0', color: '#666' }}>Advanced Pickle Game Video Analysis</p>p>

                          <div style={{ marginBottom: '30px' }}>
                                      <h2 style={{ margin: '0 0 10px 0', color: '#333' }}>Step {step} of 8</h2>h2>
                                      <div style={{ width: '100%', height: '8px', background: '#e0e0e0', borderRadius: '4px', marginBottom: '20px' }}>
                                                    <div style={{ width: (step / 8) * 100 + '%', height: '100%', background: '#667eea' }}></div>div>
                                      </div>div>

                                      <button onClick={() => setStep(Math.max(1, step - 1))} style={{ padding: '10px 20px', marginRight: '10px', cursor: 'pointer' }}>
                                                    Previous
                                      </button>button>
                                      <button onClick={() => setStep(Math.min(8, step + 1))} style={{ padding: '10px 20px', cursor: 'pointer' }}>
                                                    Next
                                      </button>button>
                          </div>div>

                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                      <div
                                      key={i}
                                      onClick={() => setStep(i)}
                                      style={{
                                                        padding: '15px',
                                                        background: step === i ? '#667eea' : '#f0f0f0',
                                                        color: step === i ? 'white' : '#333',
                                                        borderRadius: '4px',
                                                        cursor: 'pointer',
                                                        textAlign: 'center'
                                      }}
                                    >
                                    Step {i}
                      </div>div>
                    ))}
                          </div>div>
                </div>div>
        </div>div>
      );
}</div>
