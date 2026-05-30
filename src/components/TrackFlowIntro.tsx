import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Logo from './Logo';
import { 
  X, 
  HelpCircle, 
  LayoutDashboard, 
  Target, 
  TrendingUp, 
  Code2, 
  ClipboardList, 
  ArrowRight, 
  Sparkles, 
  CheckCircle2, 
  ShieldCheck, 
  Layers, 
  Zap,
  RefreshCw,
  GripVertical,
  RotateCcw
} from 'lucide-react';

interface TrackFlowIntroProps {
  onClose: () => void;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  dashboard: LayoutDashboard,
  tracking: Target,
  marketing: TrendingUp,
  rnd: Code2,
  requirements: ClipboardList,
};

const defaultServices = [
  {
    id: 'dashboard',
    name: '全局决策大盘',
    color: 'bg-indigo-50 border-indigo-200 text-indigo-700',
    tagColor: 'text-indigo-800 bg-indigo-100/70 border border-indigo-200',
    description: '统一整合各部门的关键经营指标，直观掌握企业季度利润目标达成率、销售转化率、研发流速及发布里程碑进度。',
    highlights: ['四维宏观核心指标', '季度利润目标驱动', '跨部门进度聚合图谱']
  },
  {
    id: 'tracking',
    name: '精细化项目跟踪',
    color: 'bg-amber-50 border-amber-200 text-amber-700',
    tagColor: 'text-amber-800 bg-amber-100/70 border border-amber-200',
    description: '全生命周期管理大客线索到正式交付的历程。支持多阶段（跟进中、已报价、实施中、验收中）的无缝推进。',
    highlights: ['销售跟进时间轴日志', '预期额与实际签约金额测算', '平滑的一键阶段流转']
  },
  {
    id: 'marketing',
    name: '市场开拓引擎',
    color: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    tagColor: 'text-emerald-800 bg-emerald-100/70 border border-emerald-200',
    description: '梳理市场营销战役与拓客动作、落地指标。通过与项目跟进底层打通，实时呈现销售转化的首站孵化漏斗。',
    highlights: ['客群拓展指标管理', '转化第一触点跟踪', '市场动作闭环考核']
  },
  {
    id: 'rnd',
    name: '敏捷研发看板',
    color: 'bg-blue-50 border-blue-200 text-blue-700',
    tagColor: 'text-blue-800 bg-blue-100/70 border border-blue-200',
    description: '将宏观版本发布目标敏捷拆解到里程碑和团队研发计划中。研发进度与需求直接关联，提供全流程可视化看板。',
    highlights: ['版本版本发布墙', '史诗任务链与双周排班', '一键拖拽状态卡片']
  },
  {
    id: 'requirements',
    name: '一体化需求水坝',
    color: 'bg-purple-50 border-purple-200 text-purple-700',
    tagColor: 'text-purple-800 bg-purple-100/70 border border-purple-200',
    description: '全面承接多来源（产品规划、销售反馈、自主申报、外部建议）的用户需求。建立严格的需求评级、评估与转化体系。',
    highlights: ['统一反馈接收水坝', '动态需求状态漏斗', '底层直达研发任务创建']
  }
];

export default function TrackFlowIntro({ onClose }: TrackFlowIntroProps) {
  // Simulator active step
  const [activeSimStep, setActiveSimStep] = useState<number>(0);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);

  // Reorderable services state
  const [serviceList, setServiceList] = useState(() => {
    try {
      const saved = localStorage.getItem('track_flow_intro_order');
      if (saved) {
        const orderIds = JSON.parse(saved) as string[];
        const ordered = orderIds
          .map(id => defaultServices.find(s => s.id === id))
          .filter((s): s is typeof defaultServices[0] => !!s);
        
        // Safety check to ensure all items are included
        defaultServices.forEach(s => {
          if (!ordered.some(o => o.id === s.id)) {
            ordered.push(s);
          }
        });
        return ordered;
      }
    } catch (e) {
      console.warn('Failed to parse saved layout order', e);
    }
    return [...defaultServices];
  });

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Interactive flow animation simulation data
  const simSteps = [
    {
      title: '1. 需求提出组件 (Water Backup)',
      module: '需求池',
      icon: ClipboardList,
      actor: '市场销售经理 / 产品经理',
      detail: '在项目跟进或客户拜访中，销售经理录入一条「2027版 移动端响应式面板支持」的高优先级重磅需求。',
      system: '需求进入需求水坝，标定来源、待技术组长派发。'
    },
    {
      title: '2. 研发派单及迭代绑定 (Agile Iteration)',
      module: '产品研发',
      icon: Code2,
      actor: '技术总监 / 研发组长',
      detail: '研发组长在需求池一选，直接将「移动端响应式支持」一键转化为对应的【七月研发大版本发布目标】任务书。',
      system: '研发人员绑定周任务计划，发布目标进度条随着代码提交自动向前推移。'
    },
    {
      title: '3. 项目签约及阶段流转 (Deals Delivery)',
      module: '项目跟踪',
      icon: Target,
      actor: '销售经理 / 实施负责人',
      detail: '由于响应式需求得到研发快速闭环，该项目的跟进阶段由「跟进中」正式流转为「验收中」，并最终签约盖章¥350,000元。',
      system: '系统内生成一条首单签约日志。已达成实际签约额度正式被系统识别并打上绿色标签。'
    },
    {
      title: '4. 大盘实时汇总反馈 (Executive Dashboard)',
      module: '全局总览',
      icon: LayoutDashboard,
      actor: '企业决策者 / CEO',
      detail: '管理者登录全局大盘，即刻看到2026/2027年第1季度的实际转化额大跨步上蹿¥35万！同时，业绩转化率等关键指标动态向上调整！',
      system: '季度利润目标达成率指示器优雅上扬，闭环建立。🎉'
    }
  ];

  const handleStartSimulation = () => {
    setIsSimulating(true);
    setActiveSimStep(0);
    const intervalId = setInterval(() => {
      setActiveSimStep(prev => {
        if (prev >= 3) {
          clearInterval(intervalId);
          setIsSimulating(false);
          return 3;
        }
        return prev + 1;
      });
    }, 4000);
  };

  // HTML5 Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    
    // Add a ghost background or class
    const element = e.currentTarget as HTMLElement;
    element.style.opacity = '0.4';
  };

  const handleDragEnd = (e: React.DragEvent) => {
    const element = e.currentTarget as HTMLElement;
    element.style.opacity = '1';
    setDraggedIndex(null);
    setHoveredIndex(null);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    setHoveredIndex(index);
  };

  const handleDragLeave = () => {
    setHoveredIndex(null);
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) return;

    const list = [...serviceList];
    const [draggedItem] = list.splice(draggedIndex, 1);
    list.splice(targetIndex, 0, draggedItem);
    
    setServiceList(list);
    localStorage.setItem('track_flow_intro_order', JSON.stringify(list.map(s => s.id)));
    setDraggedIndex(null);
    setHoveredIndex(null);
  };

  const handleRestoreLayout = () => {
    setServiceList([...defaultServices]);
    localStorage.removeItem('track_flow_intro_order');
  };

  return (
    <div id="track-flow-intro-page" className="fixed inset-0 bg-[#F7F6F2] z-50 overflow-y-auto selection:bg-[#1A1A1A] selection:text-white flex flex-col min-h-screen">
      {/* Dynamic Background Noise Decorator */}
      <div className="absolute inset-0 bg-[radial-gradient(#1a1a1a_0.8px,transparent_0.8px)] [background-size:24px_24px] opacity-[0.03] pointer-events-none" />

      {/* Elegant Editorial Topbar */}
      <header className="sticky top-0 bg-[#F7F6F2]/95 backdrop-blur px-6 py-6 border-b border-[#1A1A1A]/10 flex justify-between items-center z-50">
        <div className="flex items-center gap-3">
          <Logo iconSize="sm" />
          <div>
            <span className="text-sm font-bold tracking-wider font-sans text-[#1A1A1A]">TRACK FLOW BLUEPRINT</span>
            <span className="text-[10px] block opacity-40 font-mono tracking-widest leading-none">企业端对端核心服务图谱 v2.0</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {localStorage.getItem('track_flow_intro_order') && (
            <button
              onClick={handleRestoreLayout}
              className="flex items-center gap-1.5 bg-stone-100 hover:bg-stone-200 transition-colors text-stone-700 hover:text-stone-900 px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer border border-[#1A1A1A]/10"
              title="恢复默认的排版顺序"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">恢复默认布局</span>
            </button>
          )}

          <button 
            onClick={onClose}
            className="flex items-center gap-1 bg-white hover:bg-[#1A1A1A] hover:text-white transition-all text-[#1A1A1A] border-2 border-[#1A1A1A] px-3.5 py-1.5 rounded-xl text-xs font-bold tracking-wider cursor-pointer shadow-[2px_2px_0px_#1A1A1A] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0px_#1A1A1A] active:translate-x-[0px] active:translate-y-[0px] active:shadow-[1px_1px_0px_#1A1A1A]"
          >
            <X className="w-3.5 h-3.5" />
            <span>关闭介绍</span>
          </button>
        </div>
      </header>

      {/* Main Responsive Canvas Layout */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12 relative z-10">
        
        {/* Dynamic Display Title Header */}
        <motion.section 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center space-y-4 max-w-3xl mx-auto"
        >
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-black/[0.08] shadow-sm rounded-full text-[10px] font-bold text-[#1A1A1A]/60 font-mono tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-500/20" />
            <span>核心价值 · 数字驱动流程 · 敏捷交付闭环</span>
          </div>
          
          <h1 className="text-4xl sm:text-5xl font-serif italic font-bold text-[#1A1A1A] tracking-normal leading-tight">
            打通企业价值链的 <span className="underline decoration-black/[0.15] decoration-2 underline-offset-4">全栈流转管家</span>
          </h1>
          
          <p className="text-sm text-[#1A1A1A]/70 leading-relaxed font-sans max-w-2xl mx-auto">
            Track Flow 是一款精心雕琢、专注于敏捷推进与实绩转化的平台。它不仅整合了企业大盘分析、客户项目跟踪、市场落地，更向下打通研发计划与需求漏斗。
            <strong className="block text-[#1A1A1A] font-semibold mt-2 font-sans md:inline">
              通过端对端业务链路，全面消灭信息孤岛，实现“战略目标-执行交付-销售落地”的无缝闭环。
            </strong>
          </p>
        </motion.section>

        {/* Modular Bento Grid Matrix */}
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#1A1A1A]/10 pb-2">
            <div>
              <h2 className="text-lg font-serif italic text-[#1A1A1A]/80 font-bold flex items-center gap-2">
                <Layers className="w-4 h-4" /> 核心功能服务拼图
              </h2>
              <p className="text-[10px] opacity-40 uppercase tracking-widest font-mono">Five Core Structural Modules Inside Track Flow</p>
            </div>
            
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-100/80 rounded-xl border border-black/[0.05] text-[10px] text-stone-600 font-sans">
              <GripVertical className="w-3 h-3 text-stone-400" />
              <span>拖拽模块拖力条，可重新组合排版</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-10 gap-6">
            {serviceList.map((srv, index) => {
              const Icon = iconMap[srv.id] || ClipboardList;
              const isDragged = draggedIndex === index;
              const isHoveredAsDropTarget = hoveredIndex === index;

              return (
                <motion.div
                  key={srv.id}
                  layout
                  transition={{ 
                    type: 'spring', 
                    damping: 26, 
                    stiffness: 190,
                    mass: 0.8
                  }}
                  draggable
                  onDragStart={(e: any) => handleDragStart(e, index)}
                  onDragEnd={(e: any) => handleDragEnd(e)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, index)}
                  className={`bg-white border-2 p-6 lg:p-7 relative overflow-hidden transition-colors transition-shadow duration-200 shadow-[4px_4px_0px_#1A1A1A] cursor-grab active:cursor-grabbing select-none group rounded-2xl ${
                    isHoveredAsDropTarget ? 'border-amber-500 bg-amber-50/20 translate-x-1 translate-y-1 shadow-none' : 'border-[#1A1A1A] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_#1A1A1A]'
                  } ${
                    index === 0 ? 'lg:col-span-6' : index === 1 ? 'lg:col-span-4' : 'lg:col-span-12 lg:col-span-4'
                  }`}
                  style={{
                    opacity: isDragged ? 0.35 : 1,
                  }}
                >
                  {/* Drag Handle Overlay */}
                  <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-40 transition-opacity p-1.5 hover:opacity-100 hover:bg-stone-100 rounded cursor-grab">
                    <GripVertical className="w-4 h-4 text-[#1A1A1A]" />
                  </div>

                  {/* Category Accent Stripe */}
                  <div className={`absolute top-0 left-0 right-0 h-1.5 ${srv.color.split(' ')[2] || 'bg-black'}`} />

                  {/* Icon & Label heading */}
                  <div className="flex items-center justify-between mb-4 mt-2 pr-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center border-2 border-[#1A1A1A] ${srv.color} shrink-0`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <h3 className="text-base font-serif italic font-extrabold text-[#1A1A1A] leading-tight">
                        {srv.name}
                      </h3>
                    </div>
                  </div>

                  {/* Description text */}
                  <p className="text-xs text-[#1A1A1A]/75 leading-relaxed font-sans mb-5">
                    {srv.description}
                  </p>

                  {/* Highlights Bullet Tags */}
                  <div className="flex flex-wrap gap-1.5 border-t border-[#1A1A1A]/5 pt-4">
                    {srv.highlights.map(hl => (
                      <span key={hl} className="inline-flex items-center gap-1 text-[10px] font-bold text-[#1A1A1A]/80 bg-stone-100 hover:bg-stone-200 transition-colors px-2 py-0.5 rounded border border-[#1A1A1A]/5 font-sans whitespace-nowrap">
                        <CheckCircle2 className="w-3 h-3 text-[#1A1A1A]/40 shrink-0" />
                        {hl}
                      </span>
                    ))}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* Dynamic & Interactive Flow Piping Simulator */}
        <section className="bg-white border-2 border-[#1A1A1A] rounded-2xl p-6 sm:p-8 lg:p-10 shadow-[6px_6px_0px_#1A1A1A] relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[radial-gradient(#1A1A1A_1px,transparent_1px)] [background-size:12px_12px] opacity-[0.06] -mr-8 -mt-8 rounded-full pointer-events-none" />

          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 border-b border-[#1A1A1A]/10 pb-6 mb-8">
            <div className="space-y-1">
              <span className="text-[10px] font-extrabold text-amber-600 tracking-wider font-mono uppercase bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-md">
                Interactive flow simulation
              </span>
              <h2 className="text-2xl font-serif italic text-[#1A1A1A] font-bold">
                深度协同：体验端到端的数据穿透
              </h2>
              <p className="text-xs text-[#1A1A1A]/50">
                看一个具体的需求是如何在 Track Flow 底层跨越系统，完成完美链路贯通的。
              </p>
            </div>

            <button
              onClick={handleStartSimulation}
              disabled={isSimulating}
              className={`flex items-center gap-2 border-2 border-[#1A1A1A] px-5 py-2.5 rounded-xl text-xs uppercase tracking-widest font-bold font-sans transition-all shadow-[3px_3px_0px_#1A1A1A] active:translate-x-[0px] active:translate-y-[0px] active:shadow-[1px_1px_0px_#1A1A1A] cursor-pointer ${
                isSimulating 
                  ? 'bg-stone-50 border-stone-300 text-stone-400 shadow-none pointer-events-none translate-x-[2px] translate-y-[2px]' 
                  : 'bg-[#1A1A1A] hover:bg-black text-white hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[4px_4px_0px_#1A1A1A]'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSimulating ? 'animate-spin' : ''}`} />
              <span>{isSimulating ? '流转模拟中...' : '启动流转模拟'}</span>
            </button>
          </div>

          {/* Graphical Timeline / Flow Line */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 relative">
            
            {/* Visual Dotted Connection Line between columns on large screen */}
            <div className="hidden lg:block absolute top-[44px] left-[5%] right-[5%] border-t-2 border-dashed border-[#1A1A1A]/10 -z-0 pointer-events-none" />

            {simSteps.map((step, idx) => {
              const StepIcon = step.icon;
              const isSimActive = activeSimStep === idx;
              const isPassed = activeSimStep > idx;

              return (
                <div 
                  key={idx} 
                  onClick={() => !isSimulating && setActiveSimStep(idx)}
                  className={`bg-[#F7F6F2]/45 border rounded-xl p-5 relative transition-all duration-300 z-10 cursor-pointer ${
                    isSimActive 
                      ? 'bg-white border-[#1A1A1A] shadow-[4px_4px_0px_#1A1A1A] scale-[1.02]' 
                      : isPassed 
                        ? 'bg-emerald-500/[0.02] border-emerald-500/25 opacity-75' 
                        : 'border-[#1A1A1A]/10 hover:border-[#1A1A1A]/30 opacity-60 hover:opacity-100'
                  }`}
                >
                  {/* Node Badge Step Identifier */}
                  <div className={`absolute top-4 right-4 w-6 h-6 rounded-full flex items-center justify-center border text-[10px] font-mono font-bold ${
                    isSimActive 
                      ? 'bg-[#1A1A1A] text-white border-[#1A1A1A]' 
                      : isPassed 
                        ? 'bg-emerald-500 text-white border-emerald-500' 
                        : 'bg-white text-[#1A1A1A]/40 border-black/[0.08]'
                  }`}>
                    {idx + 1}
                  </div>

                  {/* Header Icon + Module tag */}
                  <div className="flex items-center gap-2 text-[10px] font-mono tracking-widest uppercase mb-4">
                    <div className={`p-1.5 rounded-lg border-2 ${
                      isSimActive 
                        ? 'bg-[#1A1A1A]/5 border-[#1A1A1A] text-black' 
                        : 'bg-white border-black/[0.08] text-stone-500'
                    }`}>
                      <StepIcon className="w-4 h-4" />
                    </div>
                    <span className={`font-bold font-sans ${isSimActive ? 'text-black' : 'text-[#1A1A1A]/55'}`}>
                      {step.module}
                    </span>
                  </div>

                  {/* Step Title */}
                  <h3 className={`text-xs font-bold font-sans mb-1.5 ${isSimActive ? 'text-[#1A1A1A]' : 'text-stone-700'}`}>
                    {step.title}
                  </h3>

                  {/* Action Actor Badge */}
                  <div className="inline-block bg-black/[0.04] text-[9px] font-medium px-2 py-0.5 rounded text-stone-600 mb-3">
                    操作者: {step.actor}
                  </div>

                  {/* Step Content Description */}
                  <p className="text-[11.5px] leading-relaxed text-[#1A1A1A]/70 font-sans mb-3">
                    {step.detail}
                  </p>

                  {/* System Triggering Logger Line */}
                  <div className={`border-t pt-3 mt-1 text-[9.5px] leading-snug font-mono ${
                    isSimActive 
                      ? 'border-[#1A1A1A]/10 text-orange-700' 
                      : isPassed 
                        ? 'border-[#1A1A1A]/5 text-emerald-700' 
                        : 'border-[#1A1A1A]/5 text-stone-400'
                  }`}>
                    <span className="font-bold">系统联动: </span>
                    {step.system}
                  </div>

                  {/* Connecting indicator icon on mobile */}
                  {idx < 3 && (
                    <div className="flex lg:hidden justify-center my-4 opacity-30">
                      <ArrowRight className="w-5 h-5 rotate-90" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Simulator Progress Bar & Prompt */}
          <div className="mt-8 bg-stone-50 border border-black/[0.05] rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Zap className="w-4 h-4 text-amber-500 shrink-0" />
              <p className="text-[11px] text-[#1A1A1A]/75 font-sans">
                当前运行态：<strong className="text-black font-semibold">协同穿透模拟 #{activeSimStep + 1} ({simSteps[activeSimStep].module})</strong>
              </p>
            </div>
            
            {/* Visual Mini Loading Progress Bar */}
            <div className="w-full sm:w-[180px] h-1.5 bg-stone-200 rounded-full overflow-hidden shrink-0">
              <div 
                className="h-full bg-[#1A1A1A] transition-all duration-[4000ms] ease-linear"
                style={{ width: isSimulating ? `${((activeSimStep + 1) / 4) * 100}%` : '25%' }}
              />
            </div>
          </div>
        </section>

        {/* Value Proposition Editorial Block */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-[#1A1A1A]/10">
          <div className="space-y-2">
            <span className="text-[9px] font-extrabold font-mono tracking-widest text-[#1A1A1A]/40 uppercase block">Why Track Flow</span>
            <h3 className="text-xl font-serif italic text-stone-900 font-bold">100% 透明执行力</h3>
            <p className="text-xs text-[#1A1A1A]/65 font-sans leading-relaxed">
              彻底打破跨部门隔阂。销售项目进展立即可视、项目延期动态实时同步，研发核心瓶颈能在大盘即刻定位，提供透明、不打折扣的数据穿透服务。
            </p>
          </div>

          <div className="space-y-2">
            <span className="text-[9px] font-extrabold font-mono tracking-widest text-[#1A1A1A]/40 uppercase block">Design Philosophy</span>
            <h3 className="text-xl font-serif italic text-stone-900 font-bold">极简现代，极致专注</h3>
            <p className="text-xs text-[#1A1A1A]/65 font-sans leading-relaxed">
              摒弃累赘堆砌的“垃圾功能”。从平面排版与现代瑞士现代设计中汲取极简视觉，保留大客户经营关键指标，为繁忙的企业领导人设计。
            </p>
          </div>

          <div className="space-y-2">
            <span className="text-[9px] font-extrabold font-mono tracking-widest text-[#1A1A1A]/40 uppercase block">Our Guarantee</span>
            <h3 className="text-xl font-serif italic text-stone-900 font-bold">安全无忧，灵活集成</h3>
            <p className="text-xs text-[#1A1A1A]/65 font-sans leading-relaxed">
              基于精益架构设计，融合本地离线和云数据库同步。提供高标准的团队层级信息授权，助力数据平滑过渡并保障系统时刻响应，不宕机、无死角。
            </p>
          </div>
        </section>

        {/* Elegant Bottom Footer */}
        <footer className="text-center pt-10 pb-4">
          <p className="text-[10px] opacity-40 font-mono tracking-wider">
            © 2026 TRACK FLOW INC. ALL RIGHTS RESERVED. · CRAFTED FOR MASTERFUL EXECUTION
          </p>
        </footer>

      </main>
    </div>
  );
}
