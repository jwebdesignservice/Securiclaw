import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { BookOpen, Copy, CheckCircle2, X, Download, Terminal } from 'lucide-react';

interface SkillModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SKILL_INSTALL_COMMAND = `openclaw skill install https://securiclaw.vercel.app/securiclaw.skill`;

const SKILL_CONTENT = `# SECURICLAW.MD - Security Scanner Skill

## Description
AI-powered code security scanner for JavaScript/TypeScript. 
Detects 30+ vulnerability types with 100% accuracy on known patterns.

## What This Skill Does
- Scans code for security vulnerabilities
- Detects: XSS, SQL injection, RCE, prototype pollution, and more
- Provides fix recommendations
- AI-enhanced analysis (optional)

## Installation

\`\`\`bash
${SKILL_INSTALL_COMMAND}
\`\`\`

## Usage (After Installation)

Your agent can now scan code:

\`\`\`
"Scan this code for security issues: [paste code]"
\`\`\`

Or use the script directly:

\`\`\`bash
openclaw run securiclaw/scan --code "eval(userInput)"
\`\`\`

## Features
- ✅ 30+ exploit types detected
- ✅ <2ms average scan time
- ✅ Deterministic + AI-enhanced modes
- ✅ No code execution (static analysis only)
- ✅ Works offline

## More Info
https://github.com/jwebdesignservice/Securiclaw
`;

const SkillModal = ({ isOpen, onClose }: SkillModalProps) => {
  const [copiedCommand, setCopiedCommand] = useState(false);
  const [copiedFull, setCopiedFull] = useState(false);

  if (!isOpen) return null;

  const copyCommand = () => {
    navigator.clipboard.writeText(SKILL_INSTALL_COMMAND);
    setCopiedCommand(true);
    setTimeout(() => setCopiedCommand(false), 2000);
  };

  const copyFull = () => {
    navigator.clipboard.writeText(SKILL_CONTENT);
    setCopiedFull(true);
    setTimeout(() => setCopiedFull(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <Card className="relative z-10 w-full max-w-2xl max-h-[85vh] overflow-hidden bg-card border-2 border-securiclaw-red/30 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <BookOpen className="w-6 h-6 text-securiclaw-red" />
            <h2 className="text-xl font-bold">SECURICLAW.MD</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-auto max-h-[60vh]">
          {/* Quick Install Section */}
          <div className="mb-6 p-4 rounded-lg bg-green-500/10 border border-green-500/30">
            <div className="flex items-center gap-2 mb-3">
              <Terminal className="w-5 h-5 text-green-400" />
              <h3 className="font-bold text-green-400">Quick Install (One Command)</h3>
            </div>
            <div className="flex gap-2">
              <code className="flex-1 p-3 bg-black/50 rounded-md text-sm font-mono text-green-300 overflow-x-auto">
                {SKILL_INSTALL_COMMAND}
              </code>
              <Button 
                onClick={copyCommand}
                variant="outline" 
                size="sm"
                className="shrink-0"
              >
                {copiedCommand ? (
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Full SECURICLAW.MD Content */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-muted-foreground uppercase tracking-wider text-xs">
                Full SECURICLAW.MD Content
              </h3>
              <Button 
                onClick={copyFull}
                variant="ghost" 
                size="sm"
                className="text-xs"
              >
                {copiedFull ? (
                  <>
                    <CheckCircle2 className="w-3 h-3 mr-1 text-green-500" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3 mr-1" />
                    Copy All
                  </>
                )}
              </Button>
            </div>
            <div className="p-4 bg-black/40 rounded-lg border border-border overflow-auto max-h-[300px]">
              <pre className="text-xs font-mono text-muted-foreground whitespace-pre-wrap leading-relaxed">
                {SKILL_CONTENT}
              </pre>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-card/50">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Paste the install command into any OpenClaw-enabled agent
            </p>
            <Button onClick={onClose} className="bg-securiclaw-red hover:bg-securiclaw-red/80">
              Got It
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default SkillModal;
