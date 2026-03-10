import { useState, useEffect, useRef, useCallback } from "react";

const STAR_COUNT = 80;

function Stars() {
  const stars = useRef(
    Array.from({ length: STAR_COUNT }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2.5 + 0.5,
      delay: Math.random() * 4,
      duration: Math.random() * 3 + 2,
    }))
  ).current;

  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }}>
      {stars.map((s) => (
        <div
          key={s.id}
          style={{
            position: "absolute",
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: s.size,
            height: s.size,
            borderRadius: "50%",
            background: "white",
            opacity: 0,
            animation: `twinkle ${s.duration}s ease-in-out ${s.delay}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

// ── Audio builders ──────────────────────────────────────────────────────────

function buildOceanSound(ctx) {
  const nodes = [];
  const bufferSize = ctx.sampleRate * 4;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 400;
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.12;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 200;
  lfo.connect(lfoGain);
  lfoGain.connect(filter.frequency);
  lfo.start();
  const gain = ctx.createGain();
  gain.gain.value = 0.35;
  source.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  source.start();
  nodes.push(source, lfo);
  return { nodes, gain };
}

function buildRainSound(ctx) {
  const nodes = [];
  const bufferSize = ctx.sampleRate * 2;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  const highpass = ctx.createBiquadFilter();
  highpass.type = "highpass";
  highpass.frequency.value = 1000;
  const lowpass = ctx.createBiquadFilter();
  lowpass.type = "lowpass";
  lowpass.frequency.value = 8000;
  const gain = ctx.createGain();
  gain.gain.value = 0.28;
  source.connect(highpass);
  highpass.connect(lowpass);
  lowpass.connect(gain);
  gain.connect(ctx.destination);
  source.start();
  nodes.push(source);
  return { nodes, gain };
}

function buildLullabySound(ctx) {
  const nodes = [];
  const scale = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25];
  const masterGain = ctx.createGain();
  masterGain.gain.value = 0.18;
  masterGain.connect(ctx.destination);
  const delay = ctx.createDelay(2.0);
  delay.delayTime.value = 0.45;
  const feedback = ctx.createGain();
  feedback.gain.value = 0.3;
  const delayGain = ctx.createGain();
  delayGain.gain.value = 0.4;
  delay.connect(feedback);
  feedback.connect(delay);
  delay.connect(delayGain);
  delayGain.connect(masterGain);
  function playNote(freq, time, dur) {
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = freq;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, time);
    env.gain.linearRampToValueAtTime(0.6, time + 0.05);
    env.gain.exponentialRampToValueAtTime(0.001, time + dur);
    osc.connect(env);
    env.connect(masterGain);
    env.connect(delay);
    osc.start(time);
    osc.stop(time + dur + 0.1);
    nodes.push(osc);
  }
  const melody = [0, 2, 4, 2, 0, 4, 2, 0, 4, 6, 4, 2, 0, 2, 4, 2];
  let interval;
  let noteIdx = 0;
  let nextTime = ctx.currentTime + 0.5;
  const beatLen = 1.1;
  function scheduleNotes() {
    while (nextTime < ctx.currentTime + 3.0) {
      const idx = melody[noteIdx % melody.length];
      playNote(scale[idx] * 0.5, nextTime, beatLen * 0.85);
      if (noteIdx % 4 === 0) playNote(scale[(idx + 2) % scale.length] * 0.5, nextTime + 0.01, beatLen * 0.7);
      nextTime += beatLen;
      noteIdx++;
    }
    interval = setTimeout(scheduleNotes, 1000);
  }
  scheduleNotes();
  nodes.push({ stop: () => clearTimeout(interval) });
  return { nodes, gain: masterGain };
}

function buildSpaceSound(ctx) {
  const nodes = [];
  const masterGain = ctx.createGain();
  masterGain.gain.value = 0.22;
  masterGain.connect(ctx.destination);
  [55, 82.4, 110, 164.8].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = freq;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.03 + i * 0.02;
    const lfoG = ctx.createGain();
    lfoG.gain.value = freq * 0.01;
    lfo.connect(lfoG);
    lfoG.connect(osc.frequency);
    const g = ctx.createGain();
    g.gain.value = 0.25;
    osc.connect(g);
    g.connect(masterGain);
    osc.start();
    lfo.start();
    nodes.push(osc, lfo);
  });
  return { nodes, gain: masterGain };
}

function buildFireSound(ctx) {
  const nodes = [];
  const bufferSize = ctx.sampleRate * 2;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = 600;
  filter.Q.value = 0.5;
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 3.5;
  const lfoG = ctx.createGain();
  lfoG.gain.value = 200;
  lfo.connect(lfoG);
  lfoG.connect(filter.frequency);
  lfo.start();
  const gain = ctx.createGain();
  gain.gain.value = 0.3;
  source.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  source.start();
  nodes.push(source, lfo);
  return { nodes, gain };
}

function buildWindChimeSound(ctx) {
  const nodes = [];
  const bufferSize = ctx.sampleRate * 2;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
  const windSrc = ctx.createBufferSource();
  windSrc.buffer = buffer;
  windSrc.loop = true;
  const windFilter = ctx.createBiquadFilter();
  windFilter.type = "bandpass";
  windFilter.frequency.value = 300;
  windFilter.Q.value = 2;
  const windGain = ctx.createGain();
  windGain.gain.value = 0.08;
  windSrc.connect(windFilter);
  windFilter.connect(windGain);
  windGain.connect(ctx.destination);
  windSrc.start();
  nodes.push(windSrc);
  const masterGain = ctx.createGain();
  masterGain.gain.value = 0.2;
  masterGain.connect(ctx.destination);
  const chimeFreqs = [523.25, 659.25, 783.99, 1046.5, 1318.5];
  let interval;
  function scheduleChime() {
    const freq = chimeFreqs[Math.floor(Math.random() * chimeFreqs.length)];
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = freq;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.5, ctx.currentTime);
    env.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2.5);
    osc.connect(env);
    env.connect(masterGain);
    osc.start();
    osc.stop(ctx.currentTime + 2.6);
    nodes.push(osc);
    interval = setTimeout(scheduleChime, 800 + Math.random() * 3000);
  }
  scheduleChime();
  nodes.push({ stop: () => clearTimeout(interval) });
  return { nodes, gain: masterGain };
}

const SONGS = [
  { emoji: "🌊", name: "Ocean Waves", description: "Gentle surf & low tide", build: buildOceanSound },
  { emoji: "🌧️", name: "Soft Rain", description: "Pitter-patter on leaves", build: buildRainSound },
  { emoji: "🎵", name: "Lullaby", description: "Gentle music box melody", build: buildLullabySound },
  { emoji: "🌌", name: "Deep Space", description: "Low cosmic drones", build: buildSpaceSound },
  { emoji: "🔥", name: "Fireplace", description: "Crackling warm fire", build: buildFireSound },
  { emoji: "🎐", name: "Wind Chimes", description: "Soft breeze & chimes", build: buildWindChimeSound },
];

// ── Music Player ────────────────────────────────────────────────────────────

function MusicPlayer() {
  const [playing, setPlaying] = useState(false);
  const [selectedSong, setSelectedSong] = useState(0);
  const [volume, setVolume] = useState(0.5);
  const audioCtxRef = useRef(null);
  const currentSoundRef = useRef(null);

  const stopSound = useCallback(() => {
    if (currentSoundRef.current) {
      currentSoundRef.current.nodes.forEach((n) => { try { if (n.stop) n.stop(); } catch (e) {} });
      currentSoundRef.current = null;
    }
  }, []);

  const startSound = useCallback((idx, vol) => {
    if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtxRef.current.state === "suspended") audioCtxRef.current.resume();
    const result = SONGS[idx].build(audioCtxRef.current);
    result.gain.gain.value = vol * result.gain.gain.value;
    currentSoundRef.current = result;
  }, []);

  useEffect(() => () => stopSound(), [stopSound]);

  function togglePlay() {
    if (playing) { stopSound(); setPlaying(false); }
    else { startSound(selectedSong, volume); setPlaying(true); }
  }

  function changeSong(idx) {
    setSelectedSong(idx);
    if (playing) { stopSound(); setTimeout(() => startSound(idx, volume), 80); }
  }

  function changeVolume(v) {
    setVolume(v);
    if (currentSoundRef.current) currentSoundRef.current.gain.gain.value = v * 0.35;
  }

  return (
    <div style={{
      background: "rgba(15,8,40,0.75)",
      border: "1px solid rgba(180,140,255,0.2)",
      borderRadius: 20,
      padding: "22px",
      backdropFilter: "blur(12px)",
      marginBottom: 36,
    }}>
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <span style={{ fontSize: 16 }}>🎶</span>
        <span style={{ color: "#8878aa", fontSize: 12, letterSpacing: "0.15em" }}>SLEEP SOUNDS</span>
        {playing && (
          <div style={{ marginLeft: "auto", display: "flex", gap: 3, alignItems: "flex-end", height: 20 }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{
                width: 3,
                background: "rgba(160,120,255,0.8)",
                borderRadius: 2,
                animation: `bar${i} 0.7s ease-in-out ${i * 0.15}s infinite alternate`,
              }} />
            ))}
          </div>
        )}
      </div>

      {/* Song grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 16 }}>
        {SONGS.map((song, i) => (
          <button key={i} onClick={() => changeSong(i)} style={{
            background: selectedSong === i ? "rgba(140,100,255,0.28)" : "rgba(255,255,255,0.04)",
            border: `1px solid ${selectedSong === i ? "rgba(180,140,255,0.5)" : "rgba(200,180,255,0.1)"}`,
            borderRadius: 14,
            padding: "10px 6px",
            cursor: "pointer",
            textAlign: "center",
            transition: "all 0.2s",
          }}>
            <div style={{ fontSize: 22, marginBottom: 4 }}>{song.emoji}</div>
            <div style={{ color: "#c4b8e0", fontSize: 11, fontFamily: "Georgia, serif", fontWeight: "normal" }}>{song.name}</div>
            <div style={{ color: "#5a4a7a", fontSize: 10, marginTop: 3 }}>{song.description}</div>
          </button>
        ))}
      </div>

      {/* Controls */}
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <button onClick={togglePlay} style={{
          width: 50, height: 50, borderRadius: "50%",
          background: playing ? "linear-gradient(135deg, #6b3fa0, #3d1f7a)" : "rgba(255,255,255,0.07)",
          border: "1px solid rgba(180,140,255,0.35)",
          color: "#f0eaff", fontSize: 20, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: "all 0.25s", flexShrink: 0,
          boxShadow: playing ? "0 0 20px rgba(100,60,200,0.4)" : "none",
        }}>
          {playing ? "⏸" : "▶"}
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 12, opacity: 0.6 }}>🔈</span>
            <input
              type="range" min={0} max={1} step={0.01} value={volume}
              onChange={(e) => changeVolume(parseFloat(e.target.value))}
              style={{ flex: 1, accentColor: "#9060d0", cursor: "pointer" }}
            />
            <span style={{ fontSize: 12, opacity: 0.6 }}>🔊</span>
          </div>
          <div style={{ color: "#5a4a7a", fontSize: 11, marginTop: 5, fontFamily: "Georgia, serif" }}>
            {playing ? `♪ ${SONGS[selectedSong].name}` : "Pick a sound & press play"}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Story themes & durations ────────────────────────────────────────────────

const STORY_THEMES = [
  { label: "🌊 Ocean", value: "a gentle ocean voyage on a boat made of clouds" },
  { label: "🌲 Forest", value: "a peaceful walk through an enchanted moonlit forest" },
  { label: "🌙 Moon", value: "a visit to the quiet, silvery surface of the moon" },
  { label: "✨ Stars", value: "floating weightlessly among friendly, glowing stars" },
  { label: "🏔️ Mountains", value: "a cozy evening in a warm cabin high in snowy mountains" },
  { label: "🌸 Garden", value: "drifting through a magical midnight garden full of fireflies" },
];

const DURATIONS = [
  { label: "Short", tokens: 200 },
  { label: "Medium", tokens: 400 },
  { label: "Long", tokens: 700 },
];

// ── Main App ────────────────────────────────────────────────────────────────

export default function SleepApp() {
  const [screen, setScreen] = useState("home");
  const [selectedTheme, setSelectedTheme] = useState(STORY_THEMES[0]);
  const [selectedDuration, setSelectedDuration] = useState(DURATIONS[1]);
  const [storyText, setStoryText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [breathPhase, setBreathPhase] = useState("inhale");
  const breathRef = useRef(null);

  useEffect(() => {
    const cycle = ["inhale", "hold", "exhale", "pause"];
    const times = [4000, 2000, 6000, 2000];
    let i = 0;
    const tick = () => {
      setBreathPhase(cycle[i]);
      i = (i + 1) % cycle.length;
      breathRef.current = setTimeout(tick, times[i]);
    };
    breathRef.current = setTimeout(tick, times[0]);
    return () => clearTimeout(breathRef.current);
  }, []);

  const breathLabels = { inhale: "Breathe In...", hold: "Hold...", exhale: "Breathe Out...", pause: "Rest..." };
  const breathScale = { inhale: 1.35, hold: 1.35, exhale: 0.75, pause: 0.75 };
  const breathTransition = {
    inhale: "transform 4s ease-in-out",
    hold: "transform 0.1s",
    exhale: "transform 6s ease-in-out",
    pause: "transform 0.1s",
  };

  async function generateStory() {
    setLoading(true);
    setError("");
    setStoryText("");
    setScreen("story");
    const prompt = `Write a soothing, dreamy bedtime story about ${selectedTheme.value}. 
The story should be calming, use gentle imagery, slow pacing, and soft language to help the reader drift off to sleep. 
End the story with the character falling peacefully asleep. 
Do not include a title. Write only the story text itself, in flowing paragraphs.`;
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: selectedDuration.tokens,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      const data = await response.json();
      setStoryText(data.content?.map((b) => b.text || "").join("") || "Once upon a time, in a place soft and still...");
    } catch (e) {
      setError("Couldn't reach the dream weaver. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "radial-gradient(ellipse at 30% 20%, #1a1040 0%, #0a0818 50%, #050510 100%)",
      fontFamily: "'Georgia', 'Times New Roman', serif",
      color: "#e8dff5",
      position: "relative",
      overflow: "hidden",
    }}>
      <style>{`
        @keyframes twinkle {
          0%,100%{opacity:0;transform:scale(.8)} 50%{opacity:.9;transform:scale(1.2)}
        }
        @keyframes moonGlow {
          0%,100%{box-shadow:0 0 40px 10px rgba(200,180,255,.3)}
          50%{box-shadow:0 0 80px 20px rgba(200,180,255,.5)}
        }
        @keyframes fadeIn {
          from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)}
        }
        @keyframes float {
          0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)}
        }
        @keyframes shimmer {
          0%,100%{opacity:.5} 50%{opacity:1}
        }
        @keyframes bar0 { from{height:6px} to{height:18px} }
        @keyframes bar1 { from{height:12px} to{height:22px} }
        @keyframes bar2 { from{height:4px} to{height:14px} }
        .theme-btn {
          background:rgba(255,255,255,.06);
          border:1px solid rgba(200,180,255,.2);
          color:#d8ccf0;border-radius:999px;
          padding:10px 20px;cursor:pointer;
          font-family:'Georgia',serif;font-size:14px;
          transition:all .3s ease;
        }
        .theme-btn:hover,.theme-btn.active {
          background:rgba(180,140,255,.2);
          border-color:rgba(180,140,255,.6);color:#f0eaff;
        }
        .dur-btn {
          background:rgba(255,255,255,.05);
          border:1px solid rgba(200,180,255,.15);
          color:#c4b8e0;border-radius:8px;
          padding:8px 20px;cursor:pointer;
          font-family:'Georgia',serif;font-size:13px;
          transition:all .25s ease;
        }
        .dur-btn.active {
          background:rgba(140,100,255,.25);
          border-color:rgba(160,120,255,.5);color:#f0eaff;
        }
        .main-btn {
          background:linear-gradient(135deg,#6b3fa0,#3d1f7a);
          border:1px solid rgba(200,170,255,.3);
          color:#f0eaff;border-radius:999px;
          padding:16px 48px;cursor:pointer;
          font-family:'Georgia',serif;font-size:18px;
          letter-spacing:.05em;transition:all .35s ease;
          box-shadow:0 4px 30px rgba(100,60,200,.3);
        }
        .main-btn:hover{transform:translateY(-2px);box-shadow:0 8px 40px rgba(120,80,220,.5)}
        .story-text{font-size:18px;line-height:2;color:#ddd4f5;animation:fadeIn 1s ease;white-space:pre-wrap}
        .back-btn {
          background:none;border:1px solid rgba(200,180,255,.2);
          color:#b0a0d0;border-radius:999px;padding:8px 24px;
          cursor:pointer;font-family:'Georgia',serif;font-size:14px;transition:all .25s;
        }
        .back-btn:hover{border-color:rgba(200,180,255,.5);color:#d0c8e8}
      `}</style>

      <Stars />

      {/* Moon */}
      <div style={{
        position: "fixed", top: -60, right: -60,
        width: 220, height: 220, borderRadius: "50%",
        background: "radial-gradient(circle at 40% 40%, #f5efd0, #d4c48a)",
        animation: "moonGlow 4s ease-in-out infinite", opacity: 0.85, zIndex: 0,
      }} />

      <div style={{ position: "relative", zIndex: 1, maxWidth: 680, margin: "0 auto", padding: "40px 24px 80px" }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 40, animation: "fadeIn 1s ease" }}>
          <div style={{ fontSize: 48, marginBottom: 12, animation: "float 6s ease-in-out infinite" }}>🌙</div>
          <h1 style={{
            fontSize: "clamp(28px,6vw,48px)", fontWeight: "normal",
            letterSpacing: "0.08em", color: "#f0eaff", margin: 0,
            textShadow: "0 0 40px rgba(180,140,255,.4)",
          }}>Dreamdrift</h1>
          <p style={{ color: "#9080b8", fontSize: 15, marginTop: 8, letterSpacing: "0.1em" }}>
            your bedtime story sanctuary
          </p>
        </div>

        {screen === "home" && (
          <div style={{ animation: "fadeIn 0.8s ease" }}>

            {/* Breathing orb */}
            <div style={{ textAlign: "center", marginBottom: 44 }}>
              <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
                <div style={{
                  width: 120, height: 120, borderRadius: "50%",
                  background: "radial-gradient(circle, rgba(140,100,255,.4), rgba(60,20,120,.2))",
                  border: "2px solid rgba(180,140,255,.3)",
                  transform: `scale(${breathScale[breathPhase]})`,
                  transition: breathTransition[breathPhase],
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: "0 0 40px rgba(120,80,220,.3)",
                }}>
                  <span style={{ fontSize: 36 }}>✦</span>
                </div>
                <span style={{ color: "#9080b8", fontSize: 14, letterSpacing: "0.15em", animation: "shimmer 2s ease infinite" }}>
                  {breathLabels[breathPhase]}
                </span>
              </div>
            </div>

            {/* 🎵 Music Player */}
            <MusicPlayer />

            {/* Theme */}
            <div style={{ marginBottom: 36 }}>
              <p style={{ textAlign: "center", color: "#8878aa", fontSize: 13, letterSpacing: "0.15em", marginBottom: 16 }}>
                CHOOSE YOUR DREAM WORLD
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center" }}>
                {STORY_THEMES.map((t) => (
                  <button key={t.value} className={`theme-btn ${selectedTheme.value === t.value ? "active" : ""}`}
                    onClick={() => setSelectedTheme(t)}>{t.label}</button>
                ))}
              </div>
            </div>

            {/* Duration */}
            <div style={{ marginBottom: 48 }}>
              <p style={{ textAlign: "center", color: "#8878aa", fontSize: 13, letterSpacing: "0.15em", marginBottom: 16 }}>
                STORY LENGTH
              </p>
              <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
                {DURATIONS.map((d) => (
                  <button key={d.label} className={`dur-btn ${selectedDuration.label === d.label ? "active" : ""}`}
                    onClick={() => setSelectedDuration(d)}>{d.label}</button>
                ))}
              </div>
            </div>

            <div style={{ textAlign: "center" }}>
              <button className="main-btn" onClick={generateStory}>Begin My Story ✦</button>
              <p style={{ color: "#5a4a7a", fontSize: 12, marginTop: 16, letterSpacing: "0.1em" }}>
                AI-crafted just for you, tonight
              </p>
            </div>
          </div>
        )}

        {screen === "story" && (
          <div style={{ animation: "fadeIn 0.8s ease" }}>
            <div style={{ marginBottom: 24, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <button className="back-btn" onClick={() => setScreen("home")}>← Back</button>
              <span style={{ color: "#6a5a8a", fontSize: 13, letterSpacing: "0.12em" }}>{selectedTheme.label}</span>
            </div>

            {/* Music player on story screen too */}
            <MusicPlayer />

            <div style={{ textAlign: "center", margin: "24px 0" }}>
              <span style={{ color: "#5a4a7a", letterSpacing: "0.5em", fontSize: 13 }}>✦ ✦ ✦</span>
            </div>

            {loading && (
              <div style={{ textAlign: "center", paddingTop: 40 }}>
                <div style={{ fontSize: 42, animation: "float 2s ease-in-out infinite", marginBottom: 24 }}>🌙</div>
                <p style={{ color: "#7060a0", fontSize: 16, letterSpacing: "0.1em", animation: "shimmer 1.5s ease infinite" }}>
                  Weaving your dream...
                </p>
              </div>
            )}

            {error && (
              <div style={{ textAlign: "center", color: "#c08080", padding: 40 }}>
                <p>{error}</p>
                <button className="back-btn" onClick={() => setScreen("home")}>Try Again</button>
              </div>
            )}

            {!loading && storyText && (
              <>
                <p className="story-text">{storyText}</p>
                <div style={{ textAlign: "center", marginTop: 56 }}>
                  <div style={{ color: "#4a3a6a", fontSize: 24, marginBottom: 16 }}>✦</div>
                  <p style={{ color: "#5a4a7a", fontSize: 14, letterSpacing: "0.15em" }}>Sweet dreams...</p>
                  <button className="main-btn" style={{ marginTop: 28 }} onClick={generateStory}>
                    Another Story ✦
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
