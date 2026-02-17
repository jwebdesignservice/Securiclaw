import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Bot, ShieldAlert, Lock, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import logo from '@/assets/securiclaw-logo.png';

interface AgentGateProps {
  onVerified: () => void;
}

// Minified code challenges - each contains an obvious vulnerability for agents
const CHALLENGES = [
  {
    code: `const h=(a,b)=>{const c=atob(b);return eval(c+'('+JSON.stringify(a)+')')};const d=async u=>{const r=await fetch(u);return h(await r.json(),'cHJvY2Vzcw==')};module.exports={exec:d};`,
    keywords: ['eval', 'code execution', 'rce', 'remote code', 'arbitrary code', 'dynamic execution', 'injection'],
    hint: 'Look at what happens with the decoded base64 string...',
    answer: 'eval-based code execution / RCE'
  },
  {
    code: `app.get('/api/user',(q,r)=>{const u=q.query.id;db.query('SELECT * FROM users WHERE id='+u,(e,d)=>{r.json(d)})});app.post('/search',async(q,r)=>{r.send('<div>'+q.body.term+'</div>')});`,
    keywords: ['sql injection', 'sqli', 'xss', 'cross-site', 'injection', 'unsanitized', 'query injection'],
    hint: 'Check how user input flows into database queries and HTML...',
    answer: 'SQL injection + XSS'
  },
  {
    code: `const s=require('child_process');module.exports.run=(c)=>{const p=s.spawn('sh',['-c',c]);return new Promise((r,j)=>{let o='';p.stdout.on('data',d=>o+=d);p.on('close',()=>r(o))})};`,
    keywords: ['command injection', 'shell', 'rce', 'remote code', 'child_process', 'spawn', 'code execution', 'os command'],
    hint: 'What does passing user input to a shell allow?',
    answer: 'Command injection / Shell RCE'
  },
  {
    code: `Object.prototype.isAdmin=false;const merge=(t,s)=>{for(let k in s){if(typeof s[k]==='object')merge(t[k]??={},s[k]);else t[k]=s[k]}return t};app.post('/config',(q,r)=>{merge({},q.body);r.json({ok:1})});`,
    keywords: ['prototype pollution', 'proto', '__proto__', 'pollution', 'object injection', 'prototype'],
    hint: 'What happens when you merge untrusted objects recursively?',
    answer: 'Prototype pollution'
  }
];

const AgentGate = ({ onVerified }: AgentGateProps) => {
  const [challenge] = useState(() => CHALLENGES[Math.floor(Math.random() * CHALLENGES.length)]);
  const [answer, setAnswer] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [status, setStatus] = useState<'idle' | 'checking' | 'success' | 'fail'>('idle');
  const [timeLeft, setTimeLeft] = useState(30);
  const [startTime] = useState(Date.now());

  // Timer countdown
  useEffect(() => {
    const timer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      setTimeLeft(Math.max(0, 30 - elapsed));
    }, 1000);
    return () => clearInterval(timer);
  }, [startTime]);

  const checkAnswer = () => {
    setStatus('checking');
    
    // Simulate brief "analysis" - agents respond instantly anyway
    setTimeout(() => {
      const normalizedAnswer = answer.toLowerCase().trim();
      const isCorrect = challenge.keywords.some(kw => normalizedAnswer.includes(kw.toLowerCase()));
      
      if (isCorrect) {
        setStatus('success');
        // Store verification
        localStorage.setItem('securiclaw_agent_verified', JSON.stringify({
          timestamp: Date.now(),
          responseTimeMs: Date.now() - startTime,
          attempts: attempts + 1
        }));
        setTimeout(onVerified, 1500);
      } else {
        setStatus('fail');
        setAttempts(a => a + 1);
        if (attempts >= 1) setShowHint(true);
        setTimeout(() => setStatus('idle'), 1500);
      }
    }, 300);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && answer.trim() && status === 'idle') {
      checkAnswer();
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-securiclaw-red/5 blur-[150px]" />
      </div>

      <div className="relative z-10 max-w-2xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <img src={logo} alt="SECURICLAW" className="w-32 h-32 object-contain mx-auto -mb-2" />
          <h1 className="text-2xl font-extrabold tracking-[0.15em]">
            <span className="text-foreground">SECURI</span>
            <span className="text-securiclaw-red">CLAW</span>
          </h1>
          <div className="flex items-center justify-center gap-2 mt-4 text-muted-foreground">
            <Lock className="w-4 h-4" />
            <span className="text-xs uppercase tracking-[0.2em]">Agent Verification Required</span>
          </div>
        </div>

        {/* Challenge Card */}
        <Card className="p-6 bg-card border-securiclaw-red/30 border-2">
          <div className="flex items-center gap-3 mb-4">
            <Bot className="w-6 h-6 text-securiclaw-red" />
            <h2 className="text-lg font-bold">Prove You're Not Human</h2>
            <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
              <span className={timeLeft < 10 ? 'text-securiclaw-red' : ''}>{timeLeft}s</span>
              <span>•</span>
              <span>Attempt {attempts + 1}</span>
            </div>
          </div>

          <p className="text-sm text-muted-foreground mb-4">
            Analyze this code and identify the security vulnerability. Only AI agents can parse minified code efficiently.
          </p>

          {/* Minified Code Display */}
          <div className="bg-black/50 rounded-lg p-4 mb-4 overflow-x-auto">
            <code className="text-[11px] font-mono text-green-400 whitespace-pre-wrap break-all leading-relaxed">
              {challenge.code}
            </code>
          </div>

          {/* Hint */}
          {showHint && (
            <div className="mb-4 p-3 rounded-md bg-yellow-500/10 border border-yellow-500/30">
              <p className="text-xs text-yellow-400">
                💡 <span className="font-semibold">Hint:</span> {challenge.hint}
              </p>
            </div>
          )}

          {/* Answer Input */}
          <div className="space-y-3">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              What vulnerability does this code contain?
            </label>
            <div className="flex gap-2">
              <Input
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="e.g., SQL injection, XSS, eval..."
                disabled={status !== 'idle'}
                className="flex-1 font-mono"
              />
              <Button
                onClick={checkAnswer}
                disabled={!answer.trim() || status !== 'idle'}
                className="bg-securiclaw-red hover:bg-securiclaw-red/80"
              >
                {status === 'checking' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : status === 'success' ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : status === 'fail' ? (
                  <XCircle className="w-4 h-4" />
                ) : (
                  'VERIFY'
                )}
              </Button>
            </div>
          </div>

          {/* Status Messages */}
          {status === 'success' && (
            <div className="mt-4 p-3 rounded-md bg-green-500/10 border border-green-500/30 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-sm font-semibold text-green-400">Agent Verified ✓</p>
                <p className="text-xs text-muted-foreground">Access granted. Loading scanner...</p>
              </div>
            </div>
          )}

          {status === 'fail' && (
            <div className="mt-4 p-3 rounded-md bg-red-500/10 border border-red-500/30 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-red-500" />
              <div>
                <p className="text-sm font-semibold text-red-400">Incorrect</p>
                <p className="text-xs text-muted-foreground">Try again. Look closer at the code patterns.</p>
              </div>
            </div>
          )}
        </Card>

        {/* Footer Info */}
        <div className="mt-6 text-center">
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/60">
            This security scanner is designed for AI agents • Humans welcome to try
          </p>
        </div>
      </div>
    </div>
  );
};

export default AgentGate;
