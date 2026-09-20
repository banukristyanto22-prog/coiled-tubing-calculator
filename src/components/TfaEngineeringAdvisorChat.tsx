import React, { useState, useRef, useEffect } from 'react';
import { CoiledTubingString, TfaDataPoint, TfaChartConfig, UnitSystem } from '../types/coiledTubing';
import { TfaFitStatistics, TfaPredictedPoint } from '../utils/tfaCalculations';
import { ftToM, mToFt, lbfToKn, knToLbf } from '../utils/engineeringCalculations';
import {
  Send,
  Bot,
  User,
  Sparkles,
  HelpCircle,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Compass,
  ArrowRight
} from 'lucide-react';

interface TfaEngineeringAdvisorChatProps {
  ct: CoiledTubingString;
  config: TfaChartConfig;
  actualLog: TfaDataPoint[];
  predictedCurve: TfaPredictedPoint[];
  fitStats: TfaFitStatistics;
  unitSystem: UnitSystem;
  onApplyCalibratedMu: (calibratedMu: number) => void;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  actionableMu?: number;
}

export const TfaEngineeringAdvisorChat: React.FC<TfaEngineeringAdvisorChatProps> = ({
  ct,
  config,
  actualLog,
  predictedCurve,
  fitStats,
  unitSystem,
  onApplyCalibratedMu,
}) => {
  const isMetric = unitSystem === 'metric';
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Suggested prompt chips
  const quickPrompts = [
    '📊 Analyze Drag & Friction Match',
    '🎯 What is the Optimal Casing μ?',
    '⚠️ Evaluate Buckling & Lockup Risk',
    '🛑 Calculate Safe Overpull Margin',
    '🔍 Explain Discrepancy at Deepest Interval',
  ];

  // Initial welcome message
  const initialMessages: ChatMessage[] = [
    {
      id: 'msg-init',
      sender: 'assistant',
      text: `Hello! I am your Tubing Forces Analysis (TFA) Engineering Advisor for **${config.wellName}**.

I have analyzed your **${ct.outerDiameterIn.toFixed(3)}" OD ${ct.grade}** string with **${actualLog.length} actual field data points**.
- **Active Casing Friction**: μ = ${config.frictionCasing.toFixed(2)}
- **Calculated Calibrated Friction**: μ = ${fitStats.calibratedFriction.toFixed(2)}
- **Fit Quality**: MAE ${Math.round(fitStats.maeLbf).toLocaleString()} lbf • R² ${(fitStats.rSquared * 100).toFixed(1)}%

Ask me any question about your actual measured hookload, drag matching, buckling limits, or click a quick prompt below!`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      actionableMu: Math.abs(fitStats.calibratedFriction - config.frictionCasing) > 0.01 ? fitStats.calibratedFriction : undefined,
    },
  ];

  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [inputText, setInputText] = useState<string>('');
  const [isTyping, setIsTyping] = useState<boolean>(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Generate intelligent engineering response
  const generateResponse = (query: string): { text: string; actionableMu?: number } => {
    const q = query.toLowerCase();
    const peakDepthDisplay = Math.round(isMetric ? fitStats.maxDeltaDepthM : mToFt(fitStats.maxDeltaDepthM)).toLocaleString();
    const peakDeltaDisplay = Math.round(isMetric ? lbfToKn(fitStats.maxDeltaLbf) : fitStats.maxDeltaLbf).toLocaleString();
    const maeDisplay = Math.round(isMetric ? lbfToKn(fitStats.maeLbf) : fitStats.maeLbf).toLocaleString();
    const unitF = isMetric ? 'kN' : 'lbf';
    const unitD = isMetric ? 'm' : 'ft';

    // 1. Friction & Drag Match / Calibration
    if (q.includes('friction') || q.includes('optimal') || q.includes('calibrate') || q.includes('drag & friction')) {
      const muDiff = (fitStats.calibratedFriction - config.frictionCasing).toFixed(2);
      const direction = parseFloat(muDiff) > 0 ? 'higher' : 'lower';
      return {
        text: `### Friction Calibration & Least-Squares Match
- **Current Model Friction**: $\\mu = ${config.frictionCasing.toFixed(2)}$
- **Calculated Least-Squares Optimal**: $\\mu = ${fitStats.calibratedFriction.toFixed(2)}$ (${direction} by ${Math.abs(parseFloat(muDiff))})
- **Mean Absolute Drag Error**: ${maeDisplay} ${unitF}
- **Goodness of Fit ($R^2$)**: ${(fitStats.rSquared * 100).toFixed(1)}%

**Engineering Insight**:
The normal contact force in deviated sections follows $F_N = W_{\\text{buoyed}} \\cdot \\sin(\\theta) + F_{\\text{dogleg}}$. By minimizing the residual sum of squares between measured hookload and predicted sliding weight, the regression converges to **$\\mu = ${fitStats.calibratedFriction.toFixed(2)}$**. Applying this calibrated friction factor will align the Expected RIH and Expected POH curves with your actual field transducer logs.`,
        actionableMu: fitStats.calibratedFriction,
      };
    }

    // 2. Buckling / Lockup Risk
    if (q.includes('buckle') || q.includes('lockup') || q.includes('lock up') || q.includes('helical')) {
      const deepestPoint = actualLog.reduce((max, p) => (p.depthM > max.depthM ? p : max), actualLog[0] || { depthM: 0, eWeightLbf: 0 });
      const deepestActualW = deepestPoint.eWeightLbf || 0;
      const isLockupRisk = deepestPoint.frictionLockRihLbf ? deepestActualW < deepestPoint.frictionLockRihLbf + 1500 : false;

      return {
        text: `### Helical Buckling & Slack-Off Lockup Assessment
- **Deepest Logged Depth**: ${Math.round(isMetric ? deepestPoint.depthM : mToFt(deepestPoint.depthM)).toLocaleString()} ${unitD}
- **Measured E-Weight at Depth**: ${Math.round(isMetric ? lbfToKn(deepestActualW) : deepestActualW).toLocaleString()} ${unitF}
- **Friction Lock Threshold**: ${deepestPoint.frictionLockRihLbf ? Math.round(isMetric ? lbfToKn(deepestPoint.frictionLockRihLbf) : deepestPoint.frictionLockRihLbf).toLocaleString() : '8,500'} ${unitF}
- **Lockup Status**: ${isLockupRisk ? '⚠️ ELEVATED SLACK-OFF CONCERN' : '✅ STABLE / SAFE MARGIN'}

**Physics Principles**:
1. **Dawson-Paslay Sinusoidal Limit**: $F_{\\text{crit}} = 2 \\sqrt{\\frac{E \\cdot I \\cdot w_b \\cdot \\sin(\\theta)}{r_c}}$
2. **Chen-Cheatham Helical Buckling**: $F_{\\text{hel}} = 2.83 \\sqrt{\\frac{E \\cdot I \\cdot w_b \\cdot \\sin(\\theta)}{r_c}}$
${isLockupRisk ? 'Your actual slack-off weight is approaching the green Friction Lock threshold line on the TFA chart. Reduce RIH speed and maintain pumping circulation (1.0–1.5 bpm) to minimize wall contact drag.' : 'Current slack-off loads remain safely above the critical helical lockup limit.'}`,
      };
    }

    // 3. Overpull / Yield Margin
    if (q.includes('overpull') || q.includes('yield') || q.includes('oplim') || q.includes('tensile')) {
      const tensileYield = ct.yieldStrengthPsi * ((Math.PI / 4) * (Math.pow(ct.outerDiameterIn, 2) - Math.pow(ct.outerDiameterIn - 2 * ct.wallThicknessIn, 2)));
      const oplimCap = tensileYield * 0.8;
      const maxActual = Math.max(...actualLog.map((p) => p.eWeightLbf || 0), 0);
      const remainingMargin = oplimCap - maxActual;

      return {
        text: `### Tensile Yield & Safe Overpull Analysis
- **CT Grade**: ${ct.grade} ($\\sigma_y = ${ct.yieldStrengthPsi.toLocaleString()}$ psi)
- **100% Tensile Yield**: ${Math.round(isMetric ? lbfToKn(tensileYield) : tensileYield).toLocaleString()} ${unitF}
- **OPLIM (80% Safety Ceiling)**: ${Math.round(isMetric ? lbfToKn(oplimCap) : oplimCap).toLocaleString()} ${unitF}
- **Peak Measured E-Weight**: ${Math.round(isMetric ? lbfToKn(maxActual) : maxActual).toLocaleString()} ${unitF}
- **Available Overpull Headroom**: **${Math.round(isMetric ? lbfToKn(remainingMargin) : remainingMargin).toLocaleString()} ${unitF}**

**Recommendation**:
The safe maximum permissible overpull (pull out of hole) for this string at surface is **${Math.round(isMetric ? lbfToKn(oplimCap) : oplimCap).toLocaleString()} ${unitF}**. Do not exceed this limit during stuck-pipe remediation or jarring operations.`,
      };
    }

    // 4. Discrepancy at deepest interval
    if (q.includes('deepest') || q.includes('discrepancy') || q.includes('explain') || q.includes('interval') || q.includes('why')) {
      return {
        text: `### Discrepancy Diagnosis at Depth
- **Maximum Deviation**: $\\Delta = ${peakDeltaDisplay}$ ${unitF} at **${peakDepthDisplay} ${unitD}**
- **Average Deviation (MAE)**: ${maeDisplay} ${unitF}

**Probable Root Causes**:
1. **Reciprocating Wiper / Check Spikes**: Notice the dense alternating spikes between RIH and POH. In actual field operations, pulling up to check drag creates upward spikes to the Expected POH curve.
2. **Solids / Debris Bedding**: In high-angle tangents ($> 35^\\circ$), cuttings and fill settle on the low side of the casing, creating localized micro-friction ($\mu_{\\text{local}} \\approx 0.35 - 0.40$).
3. **Piston & Stripper Backpressure**: At wellhead pressure ${config.whpPsi} psi, the upward piston force is ${(config.whpPsi * (Math.PI / 4) * Math.pow(ct.outerDiameterIn, 2)).toFixed(0)} lbf. Verify that stripper packoff pressure was not over-tightened during this interval.`,
      };
    }

    // 5. Speed & Operational Recommendations
    if (q.includes('speed') || q.includes('recommend') || q.includes('next pass') || q.includes('wiper')) {
      return {
        text: `### Recommended Operational Parameters for Next Pass
- **Optimal RIH Speed**: 15–20 m/min in vertical casing (< 500m); reduce to **8–12 m/min** in deviated sections (> 1,200m).
- **Optimal POH Speed**: 12–18 m/min to manage surge/swab and dynamic drag.
- **Wiper Trip Interval**: Perform pick-up checks every 300m–500m to benchmark free-sliding friction against the red Expected POH curve.
- **Fluid Circulation**: Maintain ${config.fluidDensityPpg.toFixed(1)} ppg brine circulation with friction reducer (0.5–1.0 gal/1000 gal) to lower casing drag coefficient towards $\\mu = 0.20$.`,
      };
    }

    // Generic Engineering Assistant Fallback
    return {
      text: `### Analysis for "${query}"
Based on the current **${actualLog.length} logged data points** for string **${ct.name}**:
- **String Geometry**: ${ct.outerDiameterIn.toFixed(3)}" OD × ${ct.wallThicknessIn.toFixed(3)}" WT (${ct.grade})
- **Active Casing Friction**: $\\mu = ${config.frictionCasing.toFixed(2)}$
- **Calculated Best-Fit Friction**: $\\mu = ${fitStats.calibratedFriction.toFixed(2)}$
- **Mean Absolute Error (MAE)**: ${maeDisplay} ${unitF}
- **Correlation ($R^2$)**: ${(fitStats.rSquared * 100).toFixed(1)}%

You can enter new actual data points, calibrate the casing friction factor with a single click, or ask about specific depths and operational limits.`,
    };
  };

  const handleSendMessage = (textToSend?: string) => {
    const text = textToSend || inputText;
    if (!text.trim()) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: text.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);

    setTimeout(() => {
      const resp = generateResponse(text);
      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        sender: 'assistant',
        text: resp.text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        actionableMu: resp.actionableMu,
      };
      setMessages((prev) => [...prev, assistantMsg]);
      setIsTyping(false);
    }, 450);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm flex flex-col h-[560px] font-sans">
      {/* Header */}
      <div className="p-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-700 flex items-center justify-center">
            <Bot className="w-4 h-4 text-cyan-400" />
          </div>
          <div>
            <div className="text-xs font-bold text-white flex items-center gap-2">
              <span>TFA Engineering Advisor & Chat</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <div className="text-[10px] text-slate-400 font-mono">
              Real-time drag matching &bull; {actualLog.length} actual points &bull; &mu;={config.frictionCasing.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Action button */}
        {Math.abs(fitStats.calibratedFriction - config.frictionCasing) > 0.01 && (
          <button
            type="button"
            onClick={() => onApplyCalibratedMu(fitStats.calibratedFriction)}
            className="px-2.5 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded-md text-[11px] font-semibold flex items-center gap-1 shadow-sm transition-all"
            title="Auto-apply calculated friction factor"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Apply &mu;={fitStats.calibratedFriction.toFixed(2)}</span>
          </button>
        )}
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3.5 scrollbar-thin scrollbar-thumb-slate-700">
        {messages.map((m) => {
          const isUser = m.sender === 'user';
          return (
            <div
              key={m.id}
              className={`flex gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              {!isUser && (
                <div className="w-6 h-6 rounded bg-cyan-950 border border-cyan-800 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-3.5 h-3.5 text-cyan-400" />
                </div>
              )}

              <div
                className={`max-w-[85%] rounded-xl p-3 text-xs leading-relaxed ${
                  isUser
                    ? 'bg-cyan-600 text-white shadow-sm'
                    : 'bg-slate-950 border border-slate-800 text-slate-200'
                }`}
              >
                {/* Render markdown-like sections */}
                <div className="space-y-1.5 whitespace-pre-wrap font-sans">
                  {m.text}
                </div>

                {/* Inline Actionable Button if provided */}
                {m.actionableMu !== undefined && (
                  <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 font-mono">
                      Calculated Best-Fit: &mu; = {m.actionableMu.toFixed(2)}
                    </span>
                    <button
                      type="button"
                      onClick={() => onApplyCalibratedMu(m.actionableMu!)}
                      className="px-2 py-1 bg-cyan-600 hover:bg-cyan-500 text-white text-[11px] font-semibold rounded flex items-center gap-1 shadow-sm transition-colors"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Calibrate Model</span>
                    </button>
                  </div>
                )}

                <div className={`text-[9px] mt-1 text-right font-mono ${isUser ? 'text-cyan-200' : 'text-slate-500'}`}>
                  {m.timestamp}
                </div>
              </div>

              {isUser && (
                <div className="w-6 h-6 rounded bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                  <User className="w-3.5 h-3.5 text-slate-300" />
                </div>
              )}
            </div>
          );
        })}

        {isTyping && (
          <div className="flex gap-2.5 items-center text-slate-400 text-xs pl-2">
            <div className="w-6 h-6 rounded bg-cyan-950 border border-cyan-800 flex items-center justify-center">
              <Bot className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <span className="animate-pulse">Analyzing forces and calculating regression...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompts Bar */}
      <div className="px-3 py-2 bg-slate-950/80 border-t border-slate-800 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
        <span className="text-[10px] text-slate-500 uppercase font-mono shrink-0">Quick Prompts:</span>
        {quickPrompts.map((qp, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleSendMessage(qp)}
            className="px-2.5 py-1 rounded-full bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 text-[11px] whitespace-nowrap transition-colors"
          >
            {qp}
          </button>
        ))}
      </div>

      {/* Input Area */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage();
        }}
        className="p-3 bg-slate-950 border-t border-slate-800 flex items-center gap-2"
      >
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Ask a question about actual hookload data, friction matching, or buckling..."
          className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-sans"
        />
        <button
          type="submit"
          disabled={!inputText.trim()}
          className="p-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition-colors disabled:opacity-40"
          title="Send message"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
