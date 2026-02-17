import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { runAudit, runAuditWithAI, AuditResult, SecurityIssue } from '@/lib/security/audit';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { ShieldAlert, ShieldCheck, Shield, Zap, CheckCircle2, Loader2, Share2, Copy, Brain, BookOpen } from 'lucide-react';
import AgentGate from '@/components/AgentGate';
import SkillModal from '@/components/SkillModal';
import logo from '@/assets/securiclaw-logo.png';

const ENGINE_VERSION = 'v1.1.0-ai';

// Check if agent has been verified
const isAgentVerified = (): boolean => {
  try {
    const stored = localStorage.getItem('securiclaw_agent_verified');
    if (!stored) return false;
    const data = JSON.parse(stored);
    // Verification expires after 24 hours
    const expiresMs = 24 * 60 * 60 * 1000;
    return Date.now() - data.timestamp < expiresMs;
  } catch {
    return false;
  }
};

const SEVERITY_COLORS: Record<string, string> = {
  critical: 'bg-red-600 text-white',
  high: 'bg-orange-500 text-white',
  medium: 'bg-yellow-500 text-black',
  low: 'bg-blue-400 text-black',
};

const RISK_CONFIG: Record<string, { icon: typeof ShieldAlert; color: string }> = {
  Critical: { icon: ShieldAlert, color: 'text-red-500' },
  High: { icon: ShieldAlert, color: 'text-orange-400' },
  Moderate: { icon: Shield, color: 'text-yellow-400' },
  Low: { icon: ShieldCheck, color: 'text-green-400' },
};

interface ScanLayer {
  id: number;
  name: string;
  description: string;
  status: 'pending' | 'active' | 'complete';
}

const Index = () => {
  const navigate = useNavigate();
  const [verified, setVerified] = useState<boolean>(isAgentVerified());
  const [code, setCode] = useState<string>('');
  const [result, setResult] = useState<AuditResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanLayers, setScanLayers] = useState<ScanLayer[]>([
    { id: 1, name: 'EXECUTION SAFETY', description: 'Scanning for eval, dynamic functions, shell patterns', status: 'pending' },
    { id: 2, name: 'INJECTION DEFENSE', description: 'Simulating SQL, XSS, command injection attacks', status: 'pending' },
    { id: 3, name: 'PRIVILEGE INTEGRITY', description: 'Analyzing permissions and access controls', status: 'pending' },
    { id: 4, name: 'DEPENDENCY HYGIENE', description: 'Evaluating imports and external dependencies', status: 'pending' },
    { id: 5, name: 'STRUCTURAL COMPLEXITY', description: 'AST analysis and endpoint scanning', status: 'pending' },
  ]);
  const [scanId, setScanId] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [enableAI, setEnableAI] = useState(false);
  const [showSkillModal, setShowSkillModal] = useState(false);

  const handleAudit = async () => {
    // Don't scan if empty
    if (!code.trim()) {
      setError('Please paste some code to analyze');
      return;
    }
    
    setError(null);
    setResult(null);
    setScanId(null);
    setShareUrl(null);
    setIsScanning(true);
    setScanProgress(0);

    // Reset layers
    setScanLayers(layers => layers.map(l => ({ ...l, status: 'pending' })));

    // Simulate progressive scanning
    const layerDuration = 150; // ms per layer
    let currentLayer = 0;

    const progressInterval = setInterval(() => {
      currentLayer++;
      if (currentLayer <= 5) {
        setScanLayers(layers => layers.map((l, i) => ({
          ...l,
          status: i < currentLayer - 1 ? 'complete' : i === currentLayer - 1 ? 'active' : 'pending',
        })));
        setScanProgress((currentLayer / 5) * 100);
      }
    }, layerDuration);

    // Run actual scan
    setTimeout(async () => {
      try {
        // Run deterministic or AI-enhanced scan
        const auditResult = enableAI ? await runAuditWithAI(code) : runAudit(code);
        setResult(auditResult);
        setScanLayers(layers => layers.map(l => ({ ...l, status: 'complete' })));
        setScanProgress(100);
        clearInterval(progressInterval);

        // Save to backend
        try {
          const response = await fetch('/api/scan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              code,
              results: auditResult,
              engineVersion: ENGINE_VERSION,
            }),
          });

          if (response.ok) {
            const data = await response.json();
            setScanId(data.scanId);
            setShareUrl(window.location.origin + data.shareUrl);
          } else {
            console.warn('Failed to save scan to backend');
          }
        } catch (backendError) {
          console.warn('Backend not available, running in local mode');
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Audit failed.');
        console.error('[SECURICLAW] Error:', e);
        clearInterval(progressInterval);
      } finally {
        setIsScanning(false);
      }
    }, layerDuration * 5 + 100);
  };

  const copyShareLink = () => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const viewFullReport = () => {
    if (scanId) {
      navigate(`/scan/${scanId}`);
    }
  };

  const riskCfg = result ? RISK_CONFIG[result.riskLevel] : null;
  const RiskIcon = riskCfg?.icon || Shield;

  // Show agent verification gate if not verified
  if (!verified) {
    return <AgentGate onVerified={() => setVerified(true)} />;
  }

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      {/* Info Bar - At Very Top */}
      <div className="relative z-50 py-2 border-b border-border/50 bg-background/95 backdrop-blur-sm flex-shrink-0">
        <div className="flex items-center justify-center gap-4">
          <span className="text-[9px] uppercase tracking-[0.25em] text-muted-foreground/80">
            Static Analysis Only • No Code Execution • Open Source Security Scanner
          </span>
          <button
            onClick={() => setShowSkillModal(true)}
            className="flex items-center gap-1.5 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-securiclaw-red hover:text-white bg-securiclaw-red/10 hover:bg-securiclaw-red/80 border border-securiclaw-red/30 rounded-full transition-all"
          >
            <BookOpen className="w-3 h-3" />
            SECURICLAW.MD
          </button>
        </div>
      </div>

      {/* Skill Modal */}
      <SkillModal isOpen={showSkillModal} onClose={() => setShowSkillModal(false)} />

      {/* Hero */}
      <header className="relative flex flex-col items-center justify-center pt-6 pb-3 flex-shrink-0 text-center overflow-hidden">
        <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-securiclaw-red/10 blur-[120px] pointer-events-none z-0" />
        
        <img src={logo} alt="SECURICLAW" className="w-64 h-64 object-contain -mb-6 relative z-10" />
        <h1 className="text-4xl font-extrabold tracking-[0.15em] relative z-10 mb-1">
          <span style={{ color: '#E6E8EC' }}>SECURI</span>
          <span style={{ color: '#D7263D' }}>CLAW</span>
        </h1>
        <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground mb-0 max-w-md text-center leading-relaxed">
          AI-powered security scanner for JavaScript/TypeScript
        </p>
      </header>

      {/* Editor + Audit */}
      <section className="flex flex-col items-center px-4 flex-shrink-0 py-3">
        <div className="w-full max-w-[700px] rounded-lg border border-border bg-card overflow-hidden shadow-lg relative">
          {!code && (
            <div className="absolute top-[10px] left-[60px] text-[13px] text-muted-foreground/40 pointer-events-none z-10 font-mono">
              // Paste JavaScript/TypeScript code here to audit
            </div>
          )}
          <Editor
            height="140px"
            defaultLanguage="javascript"
            value={code}
            onChange={(v) => setCode(v || '')}
            theme="vs-dark"
            options={{
              minimap: { enabled: false },
              fontSize: 13,
              lineNumbers: 'on',
              scrollBeyondLastLine: false,
              wordWrap: 'on',
              padding: { top: 10, bottom: 10 },
              overviewRulerLanes: 0,
            }}
          />
        </div>

        <div className="flex items-center gap-4 mt-3">
          <Button
            onClick={handleAudit}
            disabled={isScanning}
            className="bg-securiclaw-red hover:bg-securiclaw-red/80 text-white font-bold tracking-wider px-10 py-6 text-base shadow-lg"
          >
            {enableAI ? <Brain className="w-5 h-5 mr-2" /> : <Zap className="w-5 h-5 mr-2" />}
            {isScanning ? 'SCANNING...' : (enableAI ? 'AI-ENHANCED SCAN' : 'RUN AUDIT')}
          </Button>
          
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-card/50">
            <Brain className={`w-4 h-4 ${enableAI ? 'text-purple-400' : 'text-muted-foreground'}`} />
            <span className="text-xs font-medium">AI</span>
            <Switch
              checked={enableAI}
              onCheckedChange={setEnableAI}
              disabled={isScanning}
            />
          </div>
        </div>

        {error && (
          <p className="text-destructive text-sm mt-2 font-medium">{error}</p>
        )}

        {/* Scan Progress Layers */}
        {isScanning && (
          <div className="mt-4 w-full max-w-[700px] space-y-2">
            <Progress value={scanProgress} className="h-2" />
            <div className="space-y-1.5">
              {scanLayers.map((layer) => (
                <div key={layer.id} className="flex items-center gap-3 text-xs">
                  {layer.status === 'complete' ? (
                    <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                  ) : layer.status === 'active' ? (
                    <Loader2 className="w-4 h-4 text-securiclaw-red animate-spin flex-shrink-0" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border-2 border-muted flex-shrink-0" />
                  )}
                  <span className={`font-mono ${layer.status === 'active' ? 'text-securiclaw-red font-semibold' : layer.status === 'complete' ? 'text-green-500' : 'text-muted-foreground'}`}>
                    LAYER {layer.id}
                  </span>
                  <span className="text-muted-foreground">—</span>
                  <span className={`uppercase tracking-wider ${layer.status === 'active' ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                    {layer.name}
                  </span>
                  <span className={`ml-auto text-[10px] ${layer.status === 'complete' ? 'text-green-500 uppercase tracking-wider font-semibold' : layer.status === 'active' ? 'text-securiclaw-red' : ''}`}>
                    {layer.status === 'complete' ? 'READY' : layer.status === 'active' ? 'SCANNING...' : ''}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {!isScanning && !result && (
          <div className="flex gap-4 mt-3 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            <span>● Static Scan Active</span>
            <span>● AST Structural Inspection</span>
            <span>● Deterministic Risk Scoring</span>
          </div>
        )}
      </section>

      {/* Results or Protocol Cards */}
      <section className="flex-1 overflow-auto px-4 py-4">
        {result ? (
          <div className="max-w-4xl mx-auto">
            {/* Scan ID & Share Banner */}
            {scanId && (
              <div className="mb-4 p-4 rounded-lg border border-border bg-card/50">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Scan ID</p>
                    <p className="font-mono text-sm font-semibold text-foreground">{scanId}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Duration</p>
                    <p className="font-mono text-sm font-semibold text-foreground">{result.scanDurationMs.toFixed(0)}ms</p>
                  </div>
                </div>
                {shareUrl && (
                  <div className="flex gap-2">
                    <Button onClick={viewFullReport} variant="default" size="sm" className="flex-1">
                      <Share2 className="w-4 h-4 mr-2" />
                      View Full Report
                    </Button>
                    <Button onClick={copyShareLink} variant="outline" size="sm" className="flex-1">
                      {copied ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4 mr-2" />
                          Copy Link
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Score Header */}
            <div className="flex items-center justify-center gap-8 mb-6">
              <div className="text-center">
                <div className="text-6xl font-black tabular-nums">{result.securityScore}</div>
                <div className="text-xs uppercase tracking-widest text-muted-foreground mt-1">Security Score</div>
              </div>
              <div className={`flex items-center gap-2 ${riskCfg?.color}`}>
                <RiskIcon className="w-8 h-8" />
                <div>
                  <div className="text-2xl font-bold">{result.riskLevel} Risk</div>
                  <div className="text-xs text-muted-foreground">{result.issues.length} issue{result.issues.length !== 1 ? 's' : ''} found</div>
                </div>
              </div>
            </div>

            {/* Issues List */}
            {result.issues.length === 0 ? (
              <div className="text-center py-8">
                <ShieldCheck className="w-16 h-16 text-green-500 mx-auto mb-3" />
                <p className="text-lg font-semibold text-foreground">No issues detected</p>
                <p className="text-sm text-muted-foreground">Code looks clean! ✨</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[45vh] overflow-auto pr-2">
                {result.issues.map((issue, i) => (
                  <IssueCard key={i} issue={issue} index={i + 1} />
                ))}
              </div>
            )}
          </div>
        ) : !isScanning ? (
          <div className="max-w-4xl mx-auto grid grid-cols-3 gap-6">
            <ProtocolCard
              title="Static Analysis"
              desc="Regex-based pattern matching detects dangerous API calls, module imports, and known vulnerability signatures in source code."
            />
            <ProtocolCard
              title="AST Inspection"
              desc="Parses code into an Abstract Syntax Tree to identify structural risks: dynamic eval, unsafe fetch targets, and missing error handling."
            />
            <ProtocolCard
              title="Deterministic Scoring"
              desc="Weighted severity model (Critical=10, High=7, Medium=4, Low=1) produces a 0–100 security score with classified risk level."
            />
          </div>
        ) : null}
      </section>

    </div>
  );
};

function ProtocolCard({ title, desc }: { title: string; desc: string }) {
  return (
    <Card className="p-5 bg-card/50 border-border hover:bg-card/70 transition-colors">
      <h3 className="text-sm font-bold uppercase tracking-wider text-securiclaw-red mb-2">{title}</h3>
      <p className="text-xs leading-relaxed text-muted-foreground">{desc}</p>
    </Card>
  );
}

function IssueCard({ issue, index }: { issue: SecurityIssue; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const hasAI = issue.aiConfidence !== undefined;

  return (
    <Card 
      className="p-4 bg-card border-l-4 cursor-pointer hover:bg-card/80 transition-colors"
      style={{
        borderLeftColor: issue.severity === 'critical' ? '#dc2626' : 
                         issue.severity === 'high' ? '#ea580c' :
                         issue.severity === 'medium' ? '#ca8a04' : '#3b82f6'
      }}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-start gap-3">
        <div className="text-xl font-bold text-muted-foreground/40 min-w-[2rem]">#{index}</div>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <Badge className={`${SEVERITY_COLORS[issue.severity]} text-[11px] uppercase font-semibold`}>
              {issue.severity}
            </Badge>
            <span className="text-xs font-mono text-muted-foreground">{issue.type}</span>
            {hasAI && (
              <div className="flex items-center gap-1 text-xs text-purple-400">
                <Brain className="w-3 h-3" />
                <span>{issue.aiConfidence}% confident</span>
                {issue.falsePositive && (
                  <Badge className="bg-yellow-500/20 text-yellow-400 text-[10px] ml-1">
                    LIKELY FALSE POSITIVE
                  </Badge>
                )}
              </div>
            )}
          </div>
          <p className="text-sm text-foreground font-medium mb-2">{issue.description}</p>
          
          {expanded && (
            <div className="mt-3 space-y-2 pt-3 border-t border-border/50">
              {hasAI && issue.aiExplanation && (
                <div className="mb-3 p-3 rounded-md bg-purple-500/10 border border-purple-500/20">
                  <p className="text-xs font-semibold text-purple-400 mb-1 flex items-center gap-1">
                    <Brain className="w-3 h-3" />
                    AI Analysis:
                  </p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{issue.aiExplanation}</p>
                  {issue.contextNotes && (
                    <p className="text-xs text-muted-foreground/70 mt-2 italic">{issue.contextNotes}</p>
                  )}
                </div>
              )}
              <div>
                <p className="text-xs font-semibold text-orange-400 mb-1">⚠️ Exploit Scenario:</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{issue.exploitScenario}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-green-400 mb-1">✅ Fix:</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{issue.fix}</p>
              </div>
            </div>
          )}
          
          <p className="text-[10px] text-muted-foreground/60 mt-2 uppercase tracking-wider">
            {expanded ? '▲ Click to collapse' : '▼ Click for details'}
          </p>
        </div>
      </div>
    </Card>
  );
}

export default Index;
