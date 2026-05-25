// PickleVision Pro - v1.0.1 - With Firebase Backend
'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/authContext';
import { getUserProfile, getUserMatches, calculateProRating, saveMatch, updateUserStats, getTopPlayers, updateDisplayName, uploadMatchVideo } from '@/lib/db';
import { searchDUPRPlayer, getDUPRPlayer, getCombinedRating } from '@/lib/dupr';
import { Timestamp } from 'firebase/firestore';
import type { User, Match } from '@/lib/db';

// Global variable to store video blob across screens (Blob objects can't be serialized)
let currentVideoBlob: Blob | null = null;

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [currentScreen, setCurrentScreen] = useState(0);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-green-50 to-white">
        <div className="text-center">
          <div className="text-4xl font-bold text-green-700 mb-4">PickleVision</div>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="bg-white">
      {currentScreen === 0 && <Screen0 setScreen={setCurrentScreen} userId={user.uid} />}
      {currentScreen === 1 && <Screen1 setScreen={setCurrentScreen} />}
      {currentScreen === 2 && <Screen2 setScreen={setCurrentScreen} />}
      {currentScreen === 3 && <Screen3 setScreen={setCurrentScreen} />}
      {currentScreen === 4 && <Screen4 setScreen={setCurrentScreen} />}
      {currentScreen === 5 && <Screen5 setScreen={setCurrentScreen} />}
      {currentScreen === 6 && <Screen6 setScreen={setCurrentScreen} />}
      {currentScreen === 7 && <Screen7 setScreen={setCurrentScreen} userId={user.uid} />}
      {currentScreen === 8 && <Screen8 setScreen={setCurrentScreen} />}
      {currentScreen === 9 && <Screen9 setScreen={setCurrentScreen} userId={user.uid} />}
    </div>
  );
}

function Screen0({ setScreen, userId }: { setScreen: (n: number) => void; userId: string }) {
  const [tab, setTab] = useState('matches');
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [recentMatches, setRecentMatches] = useState<(Match & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [duprRating, setDuprRating] = useState<number | null>(null);
  const [syncingDUPR, setSyncingDUPR] = useState(false);
  const { logout } = useAuth();

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const profile = await getUserProfile(userId);
        if (profile) {
          setUserProfile(profile);

          // Try to fetch DUPR rating
          if (profile.duprId) {
            try {
              const duprPlayer = await getDUPRPlayer(profile.duprId);
              if (duprPlayer) {
                const rating = getCombinedRating(duprPlayer);
                setDuprRating(rating);
              }
            } catch (err) {
              console.error('Error fetching DUPR rating:', err);
            }
          } else if (profile.email) {
            // Try searching by email if no DUPR ID stored
            try {
              const duprPlayer = await searchDUPRPlayer(profile.email);
              if (duprPlayer) {
                const rating = getCombinedRating(duprPlayer);
                setDuprRating(rating);
              }
            } catch (err) {
              console.error('Error searching DUPR player:', err);
            }
          }
        }
        const matches = await getUserMatches(userId, 5);
        setRecentMatches(matches);
      } catch (error) {
        console.error('Error loading user data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, [userId]);

  const winRate = userProfile
    ? Math.round((userProfile.wins / (userProfile.wins + userProfile.losses)) * 100) || 0
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white p-4">
      <div className="max-w-md mx-auto">
        <div className="space-y-3 mb-6">
          <div className="flex justify-between items-center text-sm text-gray-500">
            <span>9:41</span>
            <button
              onClick={logout}
              className="text-red-600 hover:text-red-700 font-semibold"
            >
              Logout
            </button>
          </div>
          <div className="flex gap-2 justify-center">
            <button
              onClick={() => setScreen(8)}
              className="text-blue-600 hover:text-blue-700 font-semibold text-sm"
            >
              🏆 Leaderboard
            </button>
            <button
              onClick={() => setScreen(7)}
              className="text-green-600 hover:text-green-700 font-semibold text-sm"
            >
              📊 Analytics
            </button>
            <button
              onClick={async () => {
                if (!userProfile?.email) return;
                setSyncingDUPR(true);
                try {
                  const duprPlayer = await searchDUPRPlayer(userProfile.email);
                  if (duprPlayer) {
                    const rating = getCombinedRating(duprPlayer);
                    setDuprRating(rating);
                  }
                } catch (err) {
                  console.error('Error syncing DUPR:', err);
                } finally {
                  setSyncingDUPR(false);
                }
              }}
              disabled={syncingDUPR}
              className="text-blue-600 hover:text-blue-700 font-semibold text-sm disabled:opacity-50"
              title="Sync with DUPR"
            >
              {syncingDUPR ? '⏳' : '🔄'} DUPR
            </button>
            <button
              onClick={() => setScreen(9)}
              className="text-purple-600 hover:text-purple-700 font-semibold text-sm"
            >
              ⚙️ Edit Profile
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8">Loading...</div>
        ) : (
          <>
            <div className="bg-gradient-to-br from-green-600 to-green-700 rounded-3xl p-6 text-white mb-6">
              <div className="text-sm font-semibold mb-2">YOUR DUPR RATING</div>
              <div className="text-6xl font-black mb-2">
                {duprRating ? duprRating.toFixed(2) : (userProfile?.proRating?.toFixed(2) || '2.00')}
              </div>
              {duprRating && (
                <div className="bg-green-500/40 inline-block px-2 py-1 rounded-full text-xs mb-3">
                  🔄 Live from DUPR
                </div>
              )}
              <div className="text-sm">
                {userProfile?.wins || 0} wins • {userProfile?.losses || 0} losses
              </div>
            </div>

            <div className="flex gap-2 mb-6 border-b border-gray-200 overflow-x-auto">
              {['matches', 'winrate', 'avgrating', 'videos', 'analytics'].map((t) => {
                const labels = { matches: 'MATCHES', winrate: 'WIN RATE', avgrating: 'AVG RATING', videos: 'VIDEOS', analytics: 'ANALYTICS' };
                return (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={`py-3 text-xs font-semibold whitespace-nowrap ${
                      tab === t
                        ? 'text-green-700 border-b-2 border-green-700'
                        : 'text-gray-400'
                    }`}
                  >
                    {labels[t as keyof typeof labels]}
                  </button>
                );
              })}
            </div>

            <div className="mb-6">
              {tab === 'matches' && (
                <>
                  <h3 className="text-xs font-bold text-gray-500 mb-3 uppercase">
                    Recent Matches
                  </h3>
                  <div className="space-y-2">
                    {recentMatches.length > 0 ? (
                      recentMatches.map((match) => (
                        <div
                          key={match.id}
                          className="flex justify-between items-center bg-white p-3 rounded-lg border border-gray-200"
                        >
                          <span className="text-sm text-gray-600">
                            vs {match.opponent} • {match.date?.toDate?.()?.toLocaleDateString()}
                          </span>
                          <span
                            className={`${
                              match.result === 'WIN'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-red-100 text-red-700'
                            } px-3 py-1 rounded-full text-xs font-bold`}
                          >
                            {match.result}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500 py-4">No matches yet</p>
                    )}
                  </div>
                </>
              )}

              {tab === 'winrate' && (
                <>
                  <h3 className="text-xs font-bold text-gray-500 mb-3 uppercase">
                    Win Rate
                  </h3>
                  <div className="bg-white p-6 rounded-lg border border-gray-200 text-center">
                    <div className="text-5xl font-black text-green-600 mb-2">
                      {winRate}%
                    </div>
                    <div className="text-sm text-gray-600 mb-4">
                      {userProfile?.wins || 0} wins out of {(userProfile?.wins || 0) + (userProfile?.losses || 0)} matches
                    </div>
                    <div className="w-full bg-gray-300 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-green-600 h-full transition-all"
                        style={{ width: `${winRate}%` }}
                      ></div>
                    </div>
                  </div>
                </>
              )}

              {tab === 'avgrating' && (
                <>
                  <h3 className="text-xs font-bold text-gray-500 mb-3 uppercase">
                    Average Rating
                  </h3>
                  <div className="bg-white p-6 rounded-lg border border-gray-200 text-center">
                    <div className="text-5xl font-black text-green-600 mb-2">
                      {userProfile?.proRating?.toFixed(2) || '2.00'}
                    </div>
                    <div className="text-sm text-gray-600">
                      Pro Rating (Range: 1.0 - 4.0)
                    </div>
                    <div className="text-xs text-gray-500 mt-4">
                      Based on win/loss record
                    </div>
                  </div>
                </>
              )}

              {tab === 'videos' && (
                <>
                  <h3 className="text-xs font-bold text-gray-500 mb-3 uppercase">
                    My Videos
                  </h3>

                  <label className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-lg font-semibold text-center cursor-pointer block mb-4">
                    {uploading ? '⏳ Uploading...' : '📁 Upload Video File'}
                    <input
                      type="file"
                      accept="video/*"
                      disabled={uploading}
                      onChange={async (e) => {
                        if (e.target.files?.[0]) {
                          const file = e.target.files[0];
                          setUploading(true);
                          try {
                            await uploadMatchVideo(userId, `standalone_${Date.now()}`, file, (progress) => {
                              console.log(`Upload progress: ${Math.round(progress * 100)}%`);
                            });
                            alert('✅ Video uploaded successfully!');
                            // Refresh the page to see the new video
                            setTimeout(() => window.location.reload(), 500);
                          } catch (err) {
                            console.error('Upload failed:', err);
                            alert('❌ Upload failed. Please try again.');
                            setUploading(false);
                          }
                        }
                      }}
                      className="hidden"
                    />
                  </label>

                  <div className="space-y-2">
                    {recentMatches.filter(m => m.videoUrl).length > 0 ? (
                      recentMatches.filter(m => m.videoUrl).map((match) => (
                        <div
                          key={match.id}
                          className="bg-white p-4 rounded-lg border border-gray-200 flex items-center gap-3"
                        >
                          <div className="text-2xl">🎥</div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-700 truncate">
                              vs {match.opponent}
                            </p>
                            <p className="text-xs text-gray-500">
                              {match.date?.toDate?.()?.toLocaleDateString()}
                            </p>
                          </div>
                          <span className={`text-xs font-bold px-2 py-1 rounded ${
                            match.result === 'WIN' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {match.result}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500 py-4 text-center">No videos yet. Upload or record a match with video!</p>
                    )}
                  </div>
                </>
              )}

              {tab === 'analytics' && (
                <>
                  <h3 className="text-xs font-bold text-gray-500 mb-3 uppercase">
                    Quick Analytics
                  </h3>
                  <div className="space-y-3">
                    <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                      <p className="text-xs font-semibold text-blue-900 mb-2">CAREER STATS</p>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div>
                          <p className="text-lg font-bold text-blue-600">{userProfile?.wins || 0}</p>
                          <p className="text-xs text-gray-600">Wins</p>
                        </div>
                        <div>
                          <p className="text-lg font-bold text-gray-600">{(userProfile?.wins || 0) + (userProfile?.losses || 0)}</p>
                          <p className="text-xs text-gray-600">Total</p>
                        </div>
                        <div>
                          <p className="text-lg font-bold text-red-600">{userProfile?.losses || 0}</p>
                          <p className="text-xs text-gray-600">Losses</p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                      <p className="text-xs font-semibold text-purple-900 mb-2">RATING PROGRESS</p>
                      <div className="flex items-center gap-3">
                        <div className="text-3xl font-bold text-purple-600">{userProfile?.proRating?.toFixed(2)}</div>
                        <div className="flex-1">
                          <div className="w-full bg-gray-300 rounded-full h-2">
                            <div className="bg-purple-600 h-full rounded-full" style={{width: `${((userProfile?.proRating || 2) - 1) / 3 * 100}%`}}></div>
                          </div>
                          <p className="text-xs text-gray-600 mt-1">1.0 ← → 4.0</p>
                        </div>
                      </div>
                    </div>
                    <button onClick={() => setScreen(7)} className="w-full bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold py-2 rounded-lg">
                      View Full Analytics →
                    </button>
                  </div>
                </>
              )}
            </div>

            <div className="bg-amber-100 rounded-lg p-4 mb-6">
              <p className="text-xs font-bold text-amber-900">
                PRO STYLE MATCH • THIS MONTH
              </p>
            </div>

            <button
              onClick={() => setScreen(1)}
              className="w-full bg-amber-500 hover:bg-amber-600 text-black font-bold py-3 rounded-lg"
            >
              Record a match →
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function Screen1({ setScreen }: { setScreen: (n: number) => void }) {
  const [opponent, setOpponent] = useState('');
  const [yourScore, setYourScore] = useState('');
  const [oppScore, setOppScore] = useState('');
  const [result, setResult] = useState<'WIN' | 'LOSS' | ''>('');
  const [showVideoRecorder, setShowVideoRecorder] = useState(false);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startVideoRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
      const chunks: BlobPart[] = [];

      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        setVideoBlob(blob);
        currentVideoBlob = blob; // Store for access across screens
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
      setRecordingTime(0);
    } catch (err) {
      console.error('Error accessing camera:', err);
      alert('Unable to access camera. Please check permissions.');
    }
  };

  const stopVideoRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime(t => t + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const handleStartMatch = () => {
    if (opponent && yourScore && oppScore && result) {
      // Store match data to be saved on screen 3
      sessionStorage.setItem('matchData', JSON.stringify({
        opponent,
        yourScore: parseInt(yourScore),
        oppScore: parseInt(oppScore),
        result,
        hasVideo: !!videoBlob // Just track that we have a video, blob is stored globally
      }));
      setScreen(2);
    }
  };

  return (
    <div className="min-h-screen bg-white p-4">
      <div className="max-w-md mx-auto">
        <div className="flex justify-between items-center mb-6">
          <button onClick={() => setScreen(0)} className="text-sm font-semibold text-gray-600 hover:text-gray-900">← Back</button>
          <h1 className="text-lg font-bold">Record Match</h1>
          <div></div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Opponent Name</label>
            <input
              type="text"
              value={opponent}
              onChange={(e) => setOpponent(e.target.value)}
              placeholder="Enter opponent name"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Your Score</label>
              <input
                type="number"
                value={yourScore}
                onChange={(e) => setYourScore(e.target.value)}
                placeholder="Score"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Opponent Score</label>
              <input
                type="number"
                value={oppScore}
                onChange={(e) => setOppScore(e.target.value)}
                placeholder="Score"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Result</label>
            <div className="flex gap-3">
              <button
                onClick={() => setResult('WIN')}
                className={`flex-1 py-3 rounded-lg font-bold transition ${
                  result === 'WIN'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Win
              </button>
              <button
                onClick={() => setResult('LOSS')}
                className={`flex-1 py-3 rounded-lg font-bold transition ${
                  result === 'LOSS'
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Loss
              </button>
            </div>
          </div>

          <div className="border-t pt-4">
            <label className="block text-sm font-semibold text-gray-700 mb-3">Match Video (Optional)</label>

            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setShowVideoRecorder(!showVideoRecorder)}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-semibold text-sm"
              >
                {showVideoRecorder ? '🎬 Recording' : '🎬 Record Video'}
              </button>
              <label className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-2 rounded-lg font-semibold text-sm cursor-pointer flex items-center justify-center">
                📁 Upload File
                <input
                  type="file"
                  accept="video/*"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      setVideoBlob(e.target.files[0]);
                      currentVideoBlob = e.target.files[0];
                    }
                  }}
                  className="hidden"
                />
              </label>
            </div>

            {videoBlob ? (
              <div className="bg-green-50 border border-green-300 rounded-lg p-3 mb-3">
                <p className="text-sm text-green-700 font-semibold">✓ Video selected ({Math.round(videoBlob.size / 1024 / 1024 * 100) / 100} MB)</p>
                <button
                  onClick={() => {
                    setVideoBlob(null);
                    currentVideoBlob = null;
                    setShowVideoRecorder(false);
                  }}
                  className="text-xs text-green-600 hover:text-green-700 mt-2"
                >
                  Re-record video
                </button>
              </div>
            ) : showVideoRecorder ? (
              <div className="bg-gray-900 rounded-lg p-4 mb-3">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full bg-black rounded mb-3"
                  style={{ maxHeight: '300px' }}
                />
                <div className="flex gap-2 mb-3">
                  {isRecording ? (
                    <>
                      <div className="flex-1 bg-red-600 text-white py-2 rounded font-bold text-center">
                        Recording: {recordingTime}s
                      </div>
                      <button
                        onClick={stopVideoRecording}
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded font-bold"
                      >
                        Stop
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={startVideoRecording}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded font-bold"
                    >
                      🔴 Start Recording
                    </button>
                  )}
                </div>
                <button
                  onClick={() => {
                    setShowVideoRecorder(false);
                    if (streamRef.current) {
                      streamRef.current.getTracks().forEach(track => track.stop());
                    }
                  }}
                  className="w-full text-sm text-gray-400 hover:text-gray-200"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowVideoRecorder(true)}
                className="w-full bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-300 py-2 rounded-lg font-semibold text-sm"
              >
                📹 Record Match Video
              </button>
            )}
          </div>
        </div>

        <div className="flex gap-3 mt-8">
          <button
            onClick={() => setScreen(0)}
            className="flex-1 bg-gray-200 hover:bg-gray-300 text-black py-3 rounded-lg font-bold"
          >
            ← Back
          </button>
          <button
            onClick={handleStartMatch}
            disabled={!opponent || !yourScore || !oppScore || !result}
            className="flex-1 bg-amber-500 hover:bg-amber-600 disabled:bg-gray-300 text-black py-3 rounded-lg font-bold"
          >
            Continue →
          </button>
        </div>
      </div>
    </div>
  );
}

function Screen2({ setScreen }: { setScreen: (n: number) => void }) {
  return (
    <div className="min-h-screen bg-white p-4">
      <div className="max-w-md mx-auto flex flex-col items-center justify-center min-h-screen">
        <div className="relative w-40 h-40 mb-12">
          <svg className="w-full h-full" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="45" fill="none" stroke="#e5e7eb" strokeWidth="8" />
            <circle
              cx="50" cy="50" r="45" fill="none" stroke="#16a34a" strokeWidth="8"
              strokeDasharray="141 282" transform="rotate(-90 50 50)"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-4xl font-black text-green-700">62%</span>
          </div>
        </div>
        <p className="text-center text-gray-600 text-sm mb-8">
          Our AI is breaking down every rally and comparing your decisions to the pros.
        </p>
        <div className="w-full space-y-3 mb-8">
          {[
            {t:'Detected 23 rallies',d:true},
            {t:'Classified 214 shots',d:true},
            {t:'Comparing to pro benchmark',d:false,a:true},
            {t:'Building highlight reel',d:false},
            {t:'Finalizing rating',d:false}
          ].map((i,x) => (
            <div key={x} className="flex items-center gap-3">
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs"
                style={{
                  backgroundColor: i.d ? '#16a34a' : i.a ? '#f59e0b' : '#e5e7eb'
                }}
              >
                {i.d ? '✓' : i.a ? '⧖' : ''}
              </div>
              <span className="text-sm">{i.t}</span>
            </div>
          ))}
        </div>
        <button
          onClick={() => setScreen(3)}
          className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-bold"
        >
          View Results
        </button>
      </div>
    </div>
  );
}

function Screen3({ setScreen }: { setScreen: (n: number) => void }) {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');

  const handleSaveMatch = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const matchData = JSON.parse(sessionStorage.getItem('matchData') || '{}');
      const { opponent, yourScore, oppScore, result } = matchData;

      // Get current user profile
      const profile = await getUserProfile(user.uid);
      if (!profile) throw new Error('User profile not found');

      // Calculate new stats
      const newWins = result === 'WIN' ? profile.wins + 1 : profile.wins;
      const newLosses = result === 'LOSS' ? profile.losses + 1 : profile.losses;
      const newProRating = calculateProRating(newWins, newLosses);
      const ratingChange = newProRating - profile.proRating;

      // Create match object
      const matchPayload = {
        date: Timestamp.now(),
        opponent,
        yourScore,
        opponentScore: oppScore,
        result,
        ratingChange,
      };

      // Save match to Firestore (this returns docRef)
      const docRef = await saveMatch(user.uid, matchPayload);

      // Update user stats
      await updateUserStats(user.uid, newWins, newLosses, newProRating);

      // Store current match info for next screens
      sessionStorage.setItem('currentMatch', JSON.stringify({
        ...matchPayload,
        opponent,
        yourScore,
        oppScore,
        ratingBefore: profile.proRating,
        ratingAfter: newProRating,
        matchRating: 78, // Placeholder for AI-generated rating
      }));

      // Handle video upload if video was recorded
      if (matchData.hasVideo && currentVideoBlob) {
        setUploading(true);
        try {
          // Upload video to Firebase Cloud Storage with progress tracking
          const videoUrl = await uploadMatchVideo(user.uid, docRef, currentVideoBlob, (progress) => {
            setUploadProgress(Math.round(progress * 100));
          });

          // Store video URL in match data for future use
          sessionStorage.setItem('matchVideoUrl', videoUrl);

          // Clear the global blob after upload
          currentVideoBlob = null;
        } catch (err) {
          console.error('Error uploading video:', err);
          // Don't fail the entire flow if video upload fails
          setError('Video upload failed, but match was saved');
        } finally {
          setUploading(false);
          setUploadProgress(0);
        }
      }

      // Navigate to next screen
      setTimeout(() => setScreen(4), 500);
    } catch (err) {
      console.error('Error saving match:', err);
      setError('Failed to save match');
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-700 to-green-600 text-white p-4">
      <div className="max-w-md mx-auto">
        <div className="flex justify-between items-center mb-6">
          <button onClick={() => setScreen(0)} className="text-sm hover:underline">← Home</button>
          <h1 className="text-lg font-bold">Match Result</h1>
          <div></div>
        </div>
        <div className="bg-white/20 rounded-2xl p-6 mb-6">
          <div className="text-center mb-6">
            <div className="text-6xl font-black mb-2">78</div>
            <div className="text-white/80">Match Rating</div>
          </div>
          <div className="h-2 bg-white/30 rounded-full overflow-hidden">
            <div className="h-full bg-green-400" style={{width: '78%'}}></div>
          </div>
        </div>
        <div className="bg-white/10 rounded-lg p-4 mb-6">
          <p className="text-sm font-semibold mb-2">YOUR STYLE MATCH</p>
          <p className="text-white/80 text-sm mb-3">73% similar to Tyson McGuffin</p>
          <p className="text-white/60 text-xs">Your aggressive forehand and net-rushing style closely matches Tyson's championship approach.</p>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-200 p-3 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}

        {uploading && (
          <div className="bg-blue-500/20 border border-blue-500 text-blue-200 p-4 rounded-lg mb-4">
            <p className="text-sm font-semibold mb-2">Uploading video...</p>
            <div className="w-full bg-blue-500/30 rounded-full h-2 overflow-hidden">
              <div
                className="bg-blue-400 h-full transition-all duration-200"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
            <p className="text-xs mt-2">{uploadProgress}% complete</p>
          </div>
        )}

        <div className="flex gap-3 mb-4">
          <button onClick={() => setScreen(4)} disabled={saving || uploading} className="flex-1 bg-white/20 hover:bg-white/30 disabled:bg-white/10 text-white py-3 rounded-lg font-bold">Rally Breakdown</button>
          <button onClick={() => setScreen(5)} disabled={saving || uploading} className="flex-1 bg-white/20 hover:bg-white/30 disabled:bg-white/10 text-white py-3 rounded-lg font-bold">Coaching</button>
        </div>

        <button
          onClick={handleSaveMatch}
          disabled={saving || uploading}
          className="w-full bg-white text-green-700 font-bold py-3 rounded-lg hover:bg-gray-100 disabled:bg-gray-400"
        >
          {uploading ? `Uploading video... ${uploadProgress}%` : saving ? 'Saving...' : 'Save Match & Continue'}
        </button>
      </div>
    </div>
  );
}

function Screen4({ setScreen }: { setScreen: (n: number) => void }) {
  const [matchData, setMatchData] = useState<any>(null);

  useEffect(() => {
    const data = sessionStorage.getItem('currentMatch');
    if (data) {
      setMatchData(JSON.parse(data));
    }
  }, []);

  // Generate mock rallies based on actual score
  const generateRallies = () => {
    if (!matchData) return [];
    const totalPoints = (matchData.yourScore || 0) + (matchData.oppScore || 0);
    const rallies = [];
    for (let i = 0; i < Math.min(totalPoints, 5); i++) {
      rallies.push({
        number: i + 1,
        shots: Math.floor(Math.random() * 12) + 4,
        duration: Math.floor(Math.random() * 30) + 10,
        intensity: Math.random() * 100,
      });
    }
    return rallies;
  };

  const rallies = generateRallies();

  return (
    <div className="min-h-screen bg-white p-4">
      <div className="max-w-md mx-auto">
        <div className="flex justify-between items-center mb-6">
          <button onClick={() => setScreen(0)} className="text-sm font-semibold text-gray-600 hover:text-gray-900">← Back</button>
          <h1 className="text-lg font-bold">Rally Breakdown</h1>
          <div></div>
        </div>

        {matchData && (
          <>
            <div className="bg-blue-50 rounded-lg p-4 mb-6">
              <div className="text-sm font-semibold text-blue-900 mb-2">Match Summary</div>
              <div className="flex justify-between text-sm text-blue-800">
                <span>vs {matchData.opponent}</span>
                <span className="font-bold">{matchData.yourScore} - {matchData.oppScore}</span>
              </div>
            </div>

            <div className="space-y-3 mb-6">
              {rallies.length > 0 ? (
                rallies.map((rally) => (
                  <div key={rally.number} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="font-semibold text-sm mb-2">Rally {rally.number}</div>
                    <div className="text-xs text-gray-600 mb-2">{rally.shots} shots • {rally.duration} seconds</div>
                    <div className="w-full h-2 bg-gray-300 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-500" style={{width: `${rally.intensity}%`}}></div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p className="text-sm">Match data processing...</p>
                </div>
              )}
            </div>
          </>
        )}

        <div className="flex gap-3">
          <button
            onClick={() => setScreen(5)}
            className="flex-1 bg-gray-200 hover:bg-gray-300 text-black py-3 rounded-lg font-bold"
          >
            ← Coaching
          </button>
          <button
            onClick={() => setScreen(6)}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-bold"
          >
            Share Match →
          </button>
        </div>
      </div>
    </div>
  );
}

function Screen5({ setScreen }: { setScreen: (n: number) => void }) {
  const [matchData, setMatchData] = useState<any>(null);

  useEffect(() => {
    const data = sessionStorage.getItem('currentMatch');
    if (data) {
      setMatchData(JSON.parse(data));
    }
  }, []);

  const generateCoachingTips = () => {
    if (!matchData) return [];

    const tips = [];
    const { yourScore, oppScore, result } = matchData;
    const scoreDiff = Math.abs(yourScore - oppScore);

    if (result === 'WIN') {
      tips.push({
        type: 'positive',
        title: 'Strong serving performance',
        description: 'Your serve was effective. Keep up the accuracy and variation.',
      });
    }

    if (scoreDiff <= 2) {
      tips.push({
        type: 'attention',
        title: 'Tighten close matches',
        description: `You won by only ${scoreDiff} points. Work on consistency in pressure situations.`,
      });
    }

    if (result === 'LOSS') {
      tips.push({
        type: 'attention',
        title: 'Learning opportunity',
        description: 'Analyze your opponent\'s strategy. What worked against you?',
      });
    }

    tips.push({
      type: 'positive',
      title: 'Dinking fundamentals',
      description: 'Your dink control improved. Continue practicing kitchen play.',
    });

    return tips;
  };

  const tips = generateCoachingTips();

  return (
    <div className="min-h-screen bg-white p-4">
      <div className="max-w-md mx-auto">
        <div className="flex justify-between items-center mb-6">
          <button onClick={() => setScreen(0)} className="text-sm font-semibold text-gray-600 hover:text-gray-900">← Back</button>
          <h1 className="text-lg font-bold">Coaching</h1>
          <div></div>
        </div>

        {matchData && (
          <>
            <div className="bg-purple-50 rounded-lg p-4 mb-6">
              <div className="text-sm font-semibold text-purple-900 mb-3">Match Analysis</div>
              <div className="text-xs text-purple-800 space-y-2">
                <div className="flex justify-between">
                  <span>Result:</span>
                  <span className={`font-bold ${matchData.result === 'WIN' ? 'text-green-600' : 'text-red-600'}`}>
                    {matchData.result}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Rating Change:</span>
                  <span className={`font-bold ${matchData.ratingChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {matchData.ratingChange > 0 ? '+' : ''}{matchData.ratingChange.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-3 mb-6">
              {tips.map((tip, idx) => (
                <div
                  key={idx}
                  className={`border-l-4 p-4 rounded ${
                    tip.type === 'positive'
                      ? 'bg-green-50 border-green-500'
                      : 'bg-amber-50 border-amber-500'
                  }`}
                >
                  <p className={`font-semibold text-sm mb-1 ${tip.type === 'positive' ? 'text-green-900' : 'text-amber-900'}`}>
                    {tip.title}
                  </p>
                  <p className="text-xs text-gray-600">{tip.description}</p>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="flex gap-3">
          <button
            onClick={() => setScreen(4)}
            className="flex-1 bg-gray-200 hover:bg-gray-300 text-black py-3 rounded-lg font-bold"
          >
            ← Rally Breakdown
          </button>
          <button
            onClick={() => setScreen(6)}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-bold"
          >
            Share Match →
          </button>
        </div>
      </div>
    </div>
  );
}

function Screen6({ setScreen }: { setScreen: (n: number) => void }) {
  const [matchData, setMatchData] = useState<any>(null);

  useEffect(() => {
    const data = sessionStorage.getItem('currentMatch');
    if (data) {
      setMatchData(JSON.parse(data));
    }
  }, []);

  const shareText = matchData
    ? `I just recorded a pickleball match with PickleVision Pro! ${matchData.result === 'WIN' ? 'Won' : 'Lost'} ${matchData.yourScore}-${matchData.oppScore} vs ${matchData.opponent}. Rating: ${matchData.matchRating} 🥒`
    : 'Check out my pickleball match on PickleVision Pro!';

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-md mx-auto">
        <div className="flex justify-between items-center mb-6">
          <button onClick={() => setScreen(0)} className="text-sm font-semibold text-gray-600 hover:text-gray-900">← Back</button>
          <h1 className="text-lg font-bold">Share</h1>
          <div></div>
        </div>

        {matchData && (
          <>
            <div className="bg-gradient-to-br from-green-600 to-green-700 rounded-lg p-6 text-white text-center mb-6">
              <p className="text-xs opacity-80 mb-2">I just recorded a match with</p>
              <p className="text-lg font-bold mb-2">PickleVision Pro</p>
              <div className="flex justify-around mb-3">
                <div>
                  <p className="text-2xl font-black text-green-200">{matchData.yourScore}</p>
                  <p className="text-xs opacity-80">Your Score</p>
                </div>
                <div>
                  <p className="text-xl opacity-60">vs</p>
                </div>
                <div>
                  <p className="text-2xl font-black text-red-200">{matchData.oppScore}</p>
                  <p className="text-xs opacity-80">Opponent</p>
                </div>
              </div>
              <p className={`text-xl font-bold mb-2 ${matchData.result === 'WIN' ? 'text-green-200' : 'text-red-200'}`}>
                {matchData.result}
              </p>
              <p className="text-xs opacity-80">Match Rating: {matchData.matchRating}</p>
            </div>

            <div className="bg-white rounded-lg p-4 mb-6">
              <div className="text-center text-xs text-gray-600 bg-gray-50 rounded p-3">
                <p className="font-mono text-xs break-all">{shareText}</p>
              </div>
            </div>
          </>
        )}

        <div className="flex gap-3 mb-6">
          {['📱 WhatsApp', '𝕏 Twitter', '📘 Facebook'].map(s => (
            <button
              key={s}
              className="flex-1 bg-white hover:bg-gray-100 py-3 rounded-lg font-semibold text-sm border border-gray-300"
              onClick={() => alert(`Share to ${s.split(' ')[1]} clicked. (Demo mode)`)}
            >
              {s}
            </button>
          ))}
        </div>

        <button
          onClick={() => setScreen(7)}
          className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-bold"
        >
          View Stats
        </button>
      </div>
    </div>
  );
}

function Screen7({ setScreen, userId }: { setScreen: (n: number) => void; userId: string }) {
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        const profile = await getUserProfile(userId);
        if (profile) {
          setUserProfile(profile);
        }
      } catch (error) {
        console.error('Error loading profile:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUserProfile();
  }, [userId]);

  // Generate mock rating trend data
  const generateRatingTrend = () => {
    if (!userProfile) return [50, 50, 50, 50, 50, 50, 50];
    const currentRating = userProfile.proRating;
    const normalized = ((currentRating - 1) / 3) * 100; // Scale 1-4 to 0-100
    return [
      normalized * 0.7,
      normalized * 0.75,
      normalized * 0.8,
      normalized * 0.85,
      normalized * 0.9,
      normalized * 0.95,
      normalized,
    ].map(v => Math.max(30, Math.min(100, v)));
  };

  const ratingTrend = generateRatingTrend();
  const totalMatches = (userProfile?.wins || 0) + (userProfile?.losses || 0);

  return (
    <div className="min-h-screen bg-white p-4">
      <div className="max-w-md mx-auto">
        <div className="flex justify-between items-center mb-6">
          <button onClick={() => setScreen(0)} className="text-sm font-semibold text-gray-600 hover:text-gray-900">← Home</button>
          <h1 className="text-lg font-bold">Stats</h1>
          <div></div>
        </div>

        {loading ? (
          <div className="text-center py-8">Loading stats...</div>
        ) : (
          <>
            <div className="bg-blue-50 rounded-lg p-4 mb-4">
              <div className="text-xs font-bold text-blue-900 mb-3">CAREER SUMMARY</div>
              <div className="grid grid-cols-3 gap-2 text-center text-sm">
                <div className="bg-white rounded p-2">
                  <div className="text-lg font-bold text-green-600">{userProfile?.wins || 0}</div>
                  <div className="text-xs text-gray-600">Wins</div>
                </div>
                <div className="bg-white rounded p-2">
                  <div className="text-lg font-bold text-gray-600">{totalMatches}</div>
                  <div className="text-xs text-gray-600">Total</div>
                </div>
                <div className="bg-white rounded p-2">
                  <div className="text-lg font-bold text-red-600">{userProfile?.losses || 0}</div>
                  <div className="text-xs text-gray-600">Losses</div>
                </div>
              </div>
            </div>

            <div className="bg-green-50 rounded-lg p-4 mb-4">
              <div className="text-xs font-bold text-gray-500 mb-2">PRO RATING TREND</div>
              <div className="h-20 bg-white rounded flex items-end gap-1 px-2 py-2">
                {ratingTrend.map((h, i) => (
                  <div key={i} className="flex-1 bg-green-600 rounded-t" style={{height: `${h}%`}}></div>
                ))}
              </div>
              <div className="text-xs text-gray-600 mt-2">
                Current: <span className="font-bold text-green-700">{userProfile?.proRating?.toFixed(2)}</span>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <div className="text-xs font-bold text-gray-500 mb-3">SHOT MIX (Estimated)</div>
              <div className="space-y-2">
                {[
                  {l:'Dinks',w:'45%',c:'bg-green-600'},
                  {l:'Drives',w:'28%',c:'bg-amber-600'},
                  {l:'Lobs',w:'18%',c:'bg-blue-600'},
                  {l:'Drops',w:'9%',c:'bg-purple-600'}
                ].map((x,i) => (
                  <div key={i} className="flex justify-between items-center text-sm">
                    <span>{x.l}</span>
                    <div className="flex-1 mx-3 bg-gray-300 h-2 rounded-full overflow-hidden">
                      <div className={`${x.c} h-full`} style={{width: x.w}}></div>
                    </div>
                    <span className="font-bold">{x.w}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-amber-50 rounded-lg p-4 mb-4">
              <div className="text-xs font-bold text-amber-900 mb-3">AREAS TO IMPROVE</div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-amber-700 font-semibold">3rd shot placement</span>
                  <span className="text-gray-600">Practice</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-amber-700 font-semibold">Offensive drives</span>
                  <span className="text-gray-600">Timing</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-amber-700 font-semibold">Cross-court control</span>
                  <span className="text-gray-600">Accuracy</span>
                </div>
              </div>
            </div>
          </>
        )}

        <div className="flex gap-3 mt-6">
          <button
            onClick={() => setScreen(6)}
            className="flex-1 bg-gray-200 hover:bg-gray-300 text-black py-3 rounded-lg font-bold"
          >
            ← Back
          </button>
          <button
            onClick={() => setScreen(0)}
            className="flex-1 bg-amber-500 hover:bg-amber-600 text-black py-3 rounded-lg font-bold"
          >
            Home
          </button>
        </div>
      </div>
    </div>
  );
}

function Screen8({ setScreen }: { setScreen: (n: number) => void }) {
  const [topPlayers, setTopPlayers] = useState<(User & { uid: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterRange, setFilterRange] = useState<'all' | 'pro' | 'intermediate' | 'beginner'>('all');

  useEffect(() => {
    const loadTopPlayers = async () => {
      try {
        const players = await getTopPlayers(50);
        setTopPlayers(players);
      } catch (error) {
        console.error('Error loading leaderboard:', error);
      } finally {
        setLoading(false);
      }
    };

    loadTopPlayers();
  }, []);

  const filteredPlayers = topPlayers.filter(player => {
    const rating = player.proRating;
    switch (filterRange) {
      case 'pro':
        return rating >= 3.5;
      case 'intermediate':
        return rating >= 2.5 && rating < 3.5;
      case 'beginner':
        return rating < 2.5;
      default:
        return true;
    }
  });

  const getRankColor = (rank: number) => {
    if (rank === 1) return 'text-yellow-600';
    if (rank === 2) return 'text-gray-500';
    if (rank === 3) return 'text-amber-700';
    return 'text-gray-400';
  };

  const getRankMedal = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `${rank}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white p-4">
      <div className="max-w-md mx-auto">
        <div className="flex justify-between items-center mb-6">
          <button onClick={() => setScreen(0)} className="text-sm font-semibold text-gray-600 hover:text-gray-900">← Home</button>
          <h1 className="text-lg font-bold">🏆 Leaderboard</h1>
          <div></div>
        </div>

        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {[
            { key: 'all', label: 'All', icon: '👥' },
            { key: 'pro', label: 'Pro', icon: '⭐' },
            { key: 'intermediate', label: 'Intermediate', icon: '📈' },
            { key: 'beginner', label: 'Beginner', icon: '🌱' }
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilterRange(f.key as any)}
              className={`px-3 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition ${
                filterRange === f.key
                  ? 'bg-purple-600 text-white'
                  : 'bg-white border border-purple-300 text-purple-700 hover:bg-purple-50'
              }`}
            >
              {f.icon} {f.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-8">Loading leaderboard...</div>
        ) : filteredPlayers.length > 0 ? (
          <div className="space-y-3">
            {filteredPlayers.map((player, idx) => {
              const rank = topPlayers.indexOf(player) + 1;
              const totalMatches = (player.wins || 0) + (player.losses || 0);
              return (
                <div
                  key={player.uid}
                  className={`flex items-center gap-3 p-4 rounded-lg border ${
                    rank <= 3
                      ? 'bg-gradient-to-r from-yellow-50 to-white border-yellow-300'
                      : 'bg-white border-gray-200'
                  }`}
                >
                  <div className={`text-2xl font-black w-10 text-center ${getRankColor(rank)}`}>
                    {getRankMedal(rank)}
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-gray-800">
                      {player.displayName || `Player ${player.uid.slice(0, 8)}`}
                    </div>
                    <div className="text-xs text-gray-600">
                      {totalMatches} match{totalMatches !== 1 ? 'es' : ''} • {player.wins || 0} wins
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-black text-purple-600">
                      {player.proRating?.toFixed(2)}
                    </div>
                    <div className="text-xs text-gray-500">Rating</div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500">No players in this range yet</p>
          </div>
        )}

        <button
          onClick={() => setScreen(0)}
          className="w-full mt-6 bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-lg font-bold"
        >
          Back to Dashboard
        </button>
      </div>
    </div>
  );
}

function Screen9({ setScreen, userId }: { setScreen: (n: number) => void; userId: string }) {
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const profile = await getUserProfile(userId);
        if (profile) {
          setUserProfile(profile);
          setDisplayName(profile.displayName || '');
        }
      } catch (error) {
        console.error('Error loading profile:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [userId]);

  const handleSaveProfile = async () => {
    if (!displayName.trim()) {
      setSaveMessage('Display name cannot be empty');
      return;
    }

    setSaving(true);
    try {
      await updateDisplayName(userId, displayName);
      setSaveMessage('✓ Profile updated successfully!');
      setUserProfile(prev => prev ? { ...prev, displayName } : null);
      setTimeout(() => setSaveMessage(''), 2000);
    } catch (error) {
      console.error('Error updating profile:', error);
      setSaveMessage('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white p-4">
      <div className="max-w-md mx-auto">
        <div className="flex justify-between items-center mb-6">
          <button onClick={() => setScreen(0)} className="text-sm font-semibold text-gray-600 hover:text-gray-900">← Back</button>
          <h1 className="text-lg font-bold">⚙️ Edit Profile</h1>
          <div></div>
        </div>

        {loading ? (
          <div className="text-center py-8">Loading profile...</div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
            {/* Email (Read-only) */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
              <input
                type="email"
                value={userProfile?.email || ''}
                disabled
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600"
              />
              <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
            </div>

            {/* Display Name */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Display Name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your player name"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
              />
              <p className="text-xs text-gray-500 mt-1">This name will appear on the leaderboard</p>
            </div>

            {/* Stats (Read-only) */}
            <div className="border-t pt-4">
              <p className="text-sm font-semibold text-gray-700 mb-3">Your Stats</p>
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-green-50 rounded p-3 text-center">
                  <div className="text-lg font-bold text-green-600">{userProfile?.wins || 0}</div>
                  <div className="text-xs text-gray-600">Wins</div>
                </div>
                <div className="bg-gray-50 rounded p-3 text-center">
                  <div className="text-lg font-bold text-gray-600">{(userProfile?.wins || 0) + (userProfile?.losses || 0)}</div>
                  <div className="text-xs text-gray-600">Matches</div>
                </div>
                <div className="bg-purple-50 rounded p-3 text-center">
                  <div className="text-lg font-bold text-purple-600">{userProfile?.proRating?.toFixed(2)}</div>
                  <div className="text-xs text-gray-600">Rating</div>
                </div>
              </div>
            </div>

            {/* Save Message */}
            {saveMessage && (
              <div className={`p-3 rounded text-sm ${
                saveMessage.includes('✓')
                  ? 'bg-green-100 text-green-700'
                  : 'bg-red-100 text-red-700'
              }`}>
                {saveMessage}
              </div>
            )}

            {/* Save Button */}
            <button
              onClick={handleSaveProfile}
              disabled={saving || !displayName.trim()}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white font-bold py-3 rounded-lg transition"
            >
              {saving ? 'Saving...' : '💾 Save Changes'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
