import { Cpu, Server, Zap, TrendingUp, BarChart3, Layers, Workflow, Database, Cloud, Gauge, CircuitBoard, Bot } from "lucide-react";

export type ResearchCategory = 
  | "nvidia-hardware"
  | "ai-pipelines"
  | "infrastructure"
  | "market-analysis"
  | "tech-trends";

export interface ResearchTemplate {
  id: string;
  name: string;
  description: string;
  topic: string;
  category: ResearchCategory;
  depth: "quick" | "standard" | "deep";
  tags: string[];
  icon: typeof Cpu;
}

export const RESEARCH_CATEGORIES: Record<ResearchCategory, { name: string; description: string; icon: typeof Cpu }> = {
  "nvidia-hardware": {
    name: "NVIDIA Hardware",
    description: "DGX systems, GPUs, and AI accelerators",
    icon: CircuitBoard,
  },
  "ai-pipelines": {
    name: "AI/ML Pipelines",
    description: "Training, inference, and deployment workflows",
    icon: Workflow,
  },
  "infrastructure": {
    name: "Infrastructure",
    description: "Cloud, on-prem, and hybrid setups",
    icon: Server,
  },
  "market-analysis": {
    name: "Market Analysis",
    description: "Industry trends and competitive landscape",
    icon: BarChart3,
  },
  "tech-trends": {
    name: "Tech Trends",
    description: "Emerging technologies and innovations",
    icon: TrendingUp,
  },
};

export const RESEARCH_TEMPLATES: ResearchTemplate[] = [
  // NVIDIA Hardware Templates
  {
    id: "dgx-spark-overview",
    name: "NVIDIA DGX SPARK Overview",
    description: "Comprehensive analysis of NVIDIA's DGX SPARK personal AI supercomputer, including specs, pricing, and use cases",
    topic: "NVIDIA DGX SPARK personal AI supercomputer: specifications, pricing, target users, performance benchmarks, comparison with DGX Station, and ideal use cases for researchers and developers",
    category: "nvidia-hardware",
    depth: "deep",
    tags: ["DGX", "SPARK", "AI Supercomputer", "NVIDIA"],
    icon: Zap,
  },
  {
    id: "dgx-spark-vs-cloud",
    name: "DGX SPARK vs Cloud GPU",
    description: "Cost-benefit analysis comparing DGX SPARK ownership vs cloud GPU rental for AI workloads",
    topic: "DGX SPARK vs cloud GPU instances (AWS, GCP, Azure): total cost of ownership analysis, performance comparison, latency considerations, data privacy benefits, and break-even calculations for different workload types",
    category: "nvidia-hardware",
    depth: "deep",
    tags: ["DGX SPARK", "Cloud GPU", "TCO", "Cost Analysis"],
    icon: Cloud,
  },
  {
    id: "dgx-spark-setup",
    name: "DGX SPARK Setup Guide",
    description: "Research on optimal setup, configuration, and software stack for DGX SPARK systems",
    topic: "NVIDIA DGX SPARK setup and configuration best practices: software stack recommendations, CUDA toolkit versions, container orchestration, networking requirements, cooling considerations, and power requirements",
    category: "nvidia-hardware",
    depth: "standard",
    tags: ["DGX SPARK", "Setup", "Configuration"],
    icon: Server,
  },
  {
    id: "rtx-4090-specs",
    name: "RTX 4090 Deep Dive",
    description: "Technical analysis of NVIDIA RTX 4090 for AI/ML workloads",
    topic: "NVIDIA RTX 4090 for AI and machine learning: CUDA cores, tensor cores, memory bandwidth, FP16/FP32/INT8 performance, power consumption, thermal design, and comparison with professional GPUs like A100 and H100",
    category: "nvidia-hardware",
    depth: "deep",
    tags: ["RTX 4090", "GPU", "Specs", "AI/ML"],
    icon: Cpu,
  },
  {
    id: "multi-4090-setup",
    name: "Multi-GPU 4090 Configuration",
    description: "Research on building and optimizing multi-RTX 4090 systems for AI training",
    topic: "Multi-GPU RTX 4090 system configuration: motherboard compatibility, PCIe lane requirements, NVLink alternatives, power supply sizing, cooling solutions, and performance scaling for distributed training",
    category: "nvidia-hardware",
    depth: "standard",
    tags: ["RTX 4090", "Multi-GPU", "Build Guide"],
    icon: Layers,
  },

  // AI/ML Pipeline Templates
  {
    id: "x86-4090-pipeline",
    name: "x86 + RTX 4090 ML Pipeline",
    description: "End-to-end ML pipeline architecture using x86 systems with RTX 4090 GPUs",
    topic: "Building production ML pipelines on x86 systems with NVIDIA RTX 4090: data ingestion, preprocessing, distributed training with PyTorch/TensorFlow, model serving with TensorRT, monitoring, and optimization techniques",
    category: "ai-pipelines",
    depth: "deep",
    tags: ["x86", "RTX 4090", "Pipeline", "Production"],
    icon: Workflow,
  },
  {
    id: "4090-inference-optimization",
    name: "RTX 4090 Inference Optimization",
    description: "Techniques for maximizing inference performance on RTX 4090",
    topic: "RTX 4090 inference optimization: TensorRT conversion, INT8 quantization, batch size tuning, CUDA streams, memory optimization, and achieving maximum throughput for LLM and vision model inference",
    category: "ai-pipelines",
    depth: "standard",
    tags: ["RTX 4090", "Inference", "TensorRT", "Optimization"],
    icon: Gauge,
  },
  {
    id: "llm-training-4090",
    name: "LLM Training on Consumer GPUs",
    description: "Strategies for training large language models on RTX 4090 and similar GPUs",
    topic: "Training large language models on RTX 4090: gradient checkpointing, mixed precision training, DeepSpeed ZeRO, LoRA fine-tuning, memory optimization, and practical limitations compared to datacenter GPUs",
    category: "ai-pipelines",
    depth: "deep",
    tags: ["LLM", "Training", "RTX 4090", "Fine-tuning"],
    icon: Bot,
  },
  {
    id: "mlops-nvidia-stack",
    name: "MLOps with NVIDIA Stack",
    description: "Research on implementing MLOps using NVIDIA's software ecosystem",
    topic: "MLOps implementation with NVIDIA stack: NVIDIA AI Enterprise, Triton Inference Server, RAPIDS for data processing, NGC containers, model registry, A/B testing, and CI/CD for ML pipelines",
    category: "ai-pipelines",
    depth: "standard",
    tags: ["MLOps", "NVIDIA", "Triton", "RAPIDS"],
    icon: Database,
  },

  // Infrastructure Templates
  {
    id: "on-prem-vs-cloud-ai",
    name: "On-Prem vs Cloud for AI",
    description: "Strategic analysis of on-premises vs cloud infrastructure for AI workloads",
    topic: "On-premises vs cloud infrastructure for AI/ML workloads: cost modeling, performance comparison, data sovereignty, security considerations, hybrid approaches, and decision framework for different organization sizes",
    category: "infrastructure",
    depth: "deep",
    tags: ["On-Prem", "Cloud", "Infrastructure", "Strategy"],
    icon: Cloud,
  },
  {
    id: "gpu-cluster-design",
    name: "GPU Cluster Architecture",
    description: "Design considerations for building GPU clusters for AI training",
    topic: "GPU cluster architecture for AI training: network topology (InfiniBand vs Ethernet), storage systems (NVMe, parallel file systems), job scheduling (Slurm, Kubernetes), cooling infrastructure, and scaling considerations",
    category: "infrastructure",
    depth: "deep",
    tags: ["GPU Cluster", "Architecture", "HPC"],
    icon: Server,
  },
  {
    id: "kubernetes-gpu-workloads",
    name: "Kubernetes for GPU Workloads",
    description: "Best practices for running GPU workloads on Kubernetes",
    topic: "Kubernetes for GPU workloads: NVIDIA GPU Operator, device plugins, resource quotas, multi-tenancy, autoscaling GPU nodes, cost optimization, and monitoring GPU utilization in K8s clusters",
    category: "infrastructure",
    depth: "standard",
    tags: ["Kubernetes", "GPU", "Container", "Orchestration"],
    icon: Layers,
  },

  // Market Analysis Templates
  {
    id: "ai-chip-market",
    name: "AI Chip Market Analysis",
    description: "Competitive landscape of AI accelerator market",
    topic: "AI chip market analysis 2024-2025: NVIDIA vs AMD vs Intel vs custom silicon (Google TPU, Amazon Trainium), market share, pricing trends, supply chain dynamics, and emerging players in AI accelerators",
    category: "market-analysis",
    depth: "deep",
    tags: ["AI Chips", "Market", "Competition", "NVIDIA"],
    icon: BarChart3,
  },
  {
    id: "enterprise-ai-adoption",
    name: "Enterprise AI Adoption Trends",
    description: "Research on enterprise AI adoption patterns and challenges",
    topic: "Enterprise AI adoption trends: industry-specific use cases, ROI metrics, implementation challenges, talent requirements, vendor landscape, and predictions for enterprise AI spending",
    category: "market-analysis",
    depth: "standard",
    tags: ["Enterprise", "AI Adoption", "Trends"],
    icon: TrendingUp,
  },
  {
    id: "gpu-pricing-trends",
    name: "GPU Pricing & Availability",
    description: "Analysis of GPU pricing trends and supply dynamics",
    topic: "GPU pricing and availability analysis: RTX 4090, H100, A100 pricing trends, supply chain factors, cryptocurrency mining impact, cloud GPU pricing comparison, and forecasts for GPU availability",
    category: "market-analysis",
    depth: "standard",
    tags: ["GPU", "Pricing", "Supply Chain"],
    icon: BarChart3,
  },

  // Tech Trends Templates
  {
    id: "edge-ai-trends",
    name: "Edge AI Computing Trends",
    description: "Emerging trends in edge AI and embedded inference",
    topic: "Edge AI computing trends: NVIDIA Jetson ecosystem, edge inference optimization, TinyML, federated learning at the edge, 5G integration, and use cases in autonomous systems, IoT, and robotics",
    category: "tech-trends",
    depth: "standard",
    tags: ["Edge AI", "Jetson", "IoT", "Embedded"],
    icon: Cpu,
  },
  {
    id: "llm-inference-hardware",
    name: "LLM Inference Hardware Evolution",
    description: "Research on hardware innovations for LLM inference",
    topic: "LLM inference hardware evolution: GPU memory scaling, HBM3 adoption, inference-specific accelerators, speculative decoding hardware support, and emerging architectures optimized for transformer inference",
    category: "tech-trends",
    depth: "deep",
    tags: ["LLM", "Inference", "Hardware", "Innovation"],
    icon: Zap,
  },
  {
    id: "ai-sustainability",
    name: "AI Computing Sustainability",
    description: "Environmental impact and sustainability in AI computing",
    topic: "AI computing sustainability: energy consumption of training large models, carbon footprint analysis, green data center initiatives, efficient model architectures, and industry commitments to sustainable AI",
    category: "tech-trends",
    depth: "standard",
    tags: ["Sustainability", "Green AI", "Energy"],
    icon: TrendingUp,
  },
];

export function getTemplatesByCategory(category: ResearchCategory): ResearchTemplate[] {
  return RESEARCH_TEMPLATES.filter(t => t.category === category);
}

export function searchTemplates(query: string): ResearchTemplate[] {
  const lowerQuery = query.toLowerCase();
  return RESEARCH_TEMPLATES.filter(t => 
    t.name.toLowerCase().includes(lowerQuery) ||
    t.description.toLowerCase().includes(lowerQuery) ||
    t.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
  );
}
