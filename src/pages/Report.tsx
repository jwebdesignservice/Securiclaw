import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { AuditResult, SecurityIssue } from '@/lib/security/audit';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShieldAlert, ShieldCheck, Shield, Copy, CheckCircle2, ArrowLeft } from 'lucide-react';
import logo from '@/assets/securiclaw-logo.png';

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

const Report = () => {
  const { scanId } = useParams<{ scanId: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scanData, setScanData] = useState<{
    results: AuditResult;
    codeHash: string;
    engineVersion: string;
    createdAt: number;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function fetchScan() {
      try {
        const response = await fetch(`/api/scan/${scanId}`);
        if (!response.ok) {
          throw new Error(response.status === 404 ? 'Scan not found' : 'Failed to load scan');
        }
        const data = await response.json();
        setScanData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load scan');
      } finally {
        setLoading(false);
      }
    }

    if (scanId) {
      fetchScan();
    }
  }, [scanId]);

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center">
          <img src={logo} alt="SECURICLAW" className="w-32 h-32 mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">Loading scan report...</p>
        </div>
      </div>
    );
  }

  if (error || !scanData) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center max-w-md">
          <ShieldAlert className="w-16 h-16 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Scan Not Found</h1>
          <p className="text-muted-foreground mb-6">{error || 'This scan report does not exist or has expired.'}</p>
          <Link to="/">
            <Button>
              <ArrowLeft className="w-4 h-4 mr-2" />
              New Scan
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const { results, codeHash, engineVersion, createdAt } = scanData;
  const riskCfg = RISK_CONFIG[results.riskLevel];
  const RiskIcon = riskCfg.icon;
  const createdDate = new Date(createdAt).toLocaleString();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition">
            <img src={logo} alt="SECURICLAW" className="w-12 h-12" />
            <span className="text-lg font-bold tracking-wider">
              <span className="text-foreground">SECURI</span>
              <span className="text-securiclaw-red">CLAW</span>
            </span>
          </Link>
          <Button variant="outline" size="sm" onClick={copyLink}>
            {copied ? (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 mr-2" />
                Share Link
              </>
            )}
          </Button>
        </div>
      </header>

      {/* Report Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Metadata */}
        <Card className="p-4 mb-6 bg-card/50">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Scan ID</p>
              <p className="font-mono font-semibold">{scanId}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Code Hash</p>
              <p className="font-mono text-xs">{codeHash}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Created</p>
              <p className="text-xs">{createdDate}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Engine</p>
              <p className="text-xs">{engineVersion}</p>
            </div>
          </div>
        </Card>

        {/* Score Panel */}
        <div className="flex items-center justify-center gap-8 mb-8">
          <div className="text-center">
            <div className="text-6xl font-black tabular-nums">{results.securityScore}</div>
            <div className="text-xs uppercase tracking-widest text-muted-foreground mt-1">Security Score</div>
          </div>
          <div className={`flex items-center gap-2 ${riskCfg.color}`}>
            <RiskIcon className="w-8 h-8" />
            <div>
              <div className="text-2xl font-bold">{results.riskLevel} Risk</div>
              <div className="text-xs text-muted-foreground">{results.issues.length} issue{results.issues.length !== 1 ? 's' : ''}</div>
            </div>
          </div>
        </div>

        {/* Issues */}
        {results.issues.length === 0 ? (
          <div className="text-center py-12">
            <ShieldCheck className="w-20 h-20 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">No Issues Detected</h2>
            <p className="text-muted-foreground">This code passed all security checks! ✨</p>
          </div>
        ) : (
          <div className="space-y-3">
            {results.issues.map((issue, i) => (
              <IssueCard key={i} issue={issue} index={i + 1} />
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 text-center text-xs text-muted-foreground">
          <p>⚠️  This is a static analysis tool — supplement to full security audit.</p>
          <p className="mt-1">Reports are stored for 30 days. Engine: {engineVersion}</p>
        </div>
      </main>
    </div>
  );
};

function IssueCard({ issue, index }: { issue: SecurityIssue; index: number }) {
  const [expanded, setExpanded] = useState(false);

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
          <div className="flex items-center gap-3 mb-2">
            <Badge className={`${SEVERITY_COLORS[issue.severity]} text-[11px] uppercase font-semibold`}>
              {issue.severity}
            </Badge>
            <span className="text-xs font-mono text-muted-foreground">{issue.type}</span>
          </div>
          <p className="text-sm text-foreground font-medium mb-2">{issue.description}</p>
          
          {expanded && (
            <div className="mt-3 space-y-2 pt-3 border-t border-border/50">
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

export default Report;
