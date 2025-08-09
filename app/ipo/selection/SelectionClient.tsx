"use client";
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  FileText, Plus, Search, Filter, Edit3, Trash2, Eye, Calendar,
  Building, MapPin, Clock, User, Star, TrendingUp, TrendingDown,
  CheckCircle, XCircle, AlertCircle, Timer, Target, MessageSquare,
  Phone, Mail, ExternalLink, Download, Share2, ArrowRight, Save,
  X, ChevronDown, ChevronRight, ArrowLeft, Settings, Briefcase,
  Grid, List, SortAsc, SortDesc, MoreHorizontal, Users, Award,
  RefreshCw, BookOpen, Heart, Zap, Crown, Menu, Home, ChevronUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
// Local route type (replace with a shared type later if needed)
type Route = string;
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';

import { createClient } from '@/lib/supabase/client';
const supabase = createClient();

interface SelectionPageProps {
  navigate: (route: Route) => void;
}

interface SelectionStage {
  id: string;
  name: string;
  status: 'pending' | 'passed' | 'failed' | 'scheduled';
  date?: string;
  time?: string;
  location?: string;
  feedback?: string;
  interviewer?: string;
  notes?: string;
  documents?: string[];
  preparation?: string[];
  rating?: number;
  completedAt?: string;
}

interface Company {
  id: string;
  name: string;
  industry: string;
  size: 'startup' | 'sme' | 'large' | 'megacorp';
  location: string;
  appliedDate: string;
  status: 'applied' | 'in_progress' | 'final_interview' | 'offer' | 'rejected' | 'withdrawn';
  currentStage: number;
  stages: SelectionStage[];
  priority: 'high' | 'medium' | 'low';
  notes: string;
  contacts: {
    name: string;
    role: string;
    email?: string;
    phone?: string;
  }[];
  jobDetails: {
    title: string;
    salary?: string;
    benefits?: string[];
    requirements?: string[];
    description?: string;
  };
  lastUpdate: string;
  overallRating?: number;
  tags: string[];
}

const STATUS_CONFIG = {
  applied: { 
    label: 'エントリー済み', 
    shortLabel: 'エントリー',
    color: 'bg-blue-50 text-blue-700 border-blue-200', 
    icon: FileText, 
    gradient: 'from-blue-400 to-blue-600',
    dotColor: 'bg-blue-500'
  },
  in_progress: { 
    label: '選考中', 
    shortLabel: '選考中',
    color: 'bg-yellow-50 text-yellow-700 border-yellow-200', 
    icon: Timer, 
    gradient: 'from-yellow-400 to-yellow-600',
    dotColor: 'bg-yellow-500'
  },
  final_interview: { 
    label: '最終面接', 
    shortLabel: '最終',
    color: 'bg-purple-50 text-purple-700 border-purple-200', 
    icon: Star, 
    gradient: 'from-purple-400 to-purple-600',
    dotColor: 'bg-purple-500'
  },
  offer: { 
    label: '内定', 
    shortLabel: '内定',
    color: 'bg-green-50 text-green-700 border-green-200', 
    icon: CheckCircle, 
    gradient: 'from-green-400 to-green-600',
    dotColor: 'bg-green-500'
  },
  rejected: { 
    label: '不合格', 
    shortLabel: '不合格',
    color: 'bg-red-50 text-red-700 border-red-200', 
    icon: XCircle, 
    gradient: 'from-red-400 to-red-600',
    dotColor: 'bg-red-500'
  },
  withdrawn: { 
    label: '辞退', 
    shortLabel: '辞退',
    color: 'bg-gray-50 text-gray-700 border-gray-200', 
    icon: AlertCircle, 
    gradient: 'from-gray-400 to-gray-600',
    dotColor: 'bg-gray-500'
  }
};

const PRIORITY_CONFIG = {
  high: { 
    label: '第一志望', 
    shortLabel: '第一',
    color: 'bg-red-50 text-red-700 border-red-200', 
    icon: Crown,
    gradient: 'from-red-400 to-red-600',
    dotColor: 'bg-red-500'
  },
  medium: { 
    label: '第二志望', 
    shortLabel: '第二',
    color: 'bg-orange-50 text-orange-700 border-orange-200', 
    icon: Target,
    gradient: 'from-orange-400 to-orange-600',
    dotColor: 'bg-orange-500'
  },
  low: { 
    label: '練習', 
    shortLabel: '練習',
    color: 'bg-gray-50 text-gray-700 border-gray-200', 
    icon: BookOpen,
    gradient: 'from-gray-400 to-gray-600',
    dotColor: 'bg-gray-500'
  }
};

const COMPANY_SIZES = {
  startup: { label: 'スタートアップ', shortLabel: 'ST', icon: Zap, color: 'text-purple-600' },
  sme: { label: '中小企業', shortLabel: '中小', icon: Building, color: 'text-blue-600' },
  large: { label: '大企業', shortLabel: '大手', icon: Building, color: 'text-green-600' },
  megacorp: { label: '超大手企業', shortLabel: '超大手', icon: Crown, color: 'text-orange-600' }
};

const INDUSTRIES = [
  'IT・ソフトウェア', 'コンサルティング', '金融・銀行', '商社', 'メーカー',
  '広告・マーケティング', '不動産', '医療・ヘルスケア', '教育', '小売・サービス',
  '公務員・非営利', 'その他'
];

export function SelectionPage({ navigate }: SelectionPageProps) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [showCompanyDialog, setShowCompanyDialog] = useState(false);
  const [showStageDialog, setShowStageDialog] = useState(false);
  const [showAddCompanyDialog, setShowAddCompanyDialog] = useState(false);
  const [showEditCompanyDialog, setShowEditCompanyDialog] = useState(false);
  const [selectedStage, setSelectedStage] = useState<SelectionStage | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'priority' | 'status'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Form states
  type CompanyFormState = {
    name: string;
    industry: string;
    size: Company['size'];
    location: string;
    priority: Company['priority'];
    jobTitle: string;
    salary: string;
    description: string;
    notes: string;
    tags: string;
  };

  const [companyForm, setCompanyForm] = useState<CompanyFormState>({
    name: '',
    industry: '',
    size: 'large',
    location: '',
    priority: 'medium',
    jobTitle: '',
    salary: '',
    description: '',
    notes: '',
    tags: ''
  });

  type StageFormState = {
    name: string;
    status: SelectionStage['status'];
    date: string;
    time: string;
    location: string;
    feedback: string;
    interviewer: string;
    notes: string;
    rating: number;
  };

  const [stageForm, setStageForm] = useState<StageFormState>({
    name: '',
    status: 'pending',
    date: '',
    time: '',
    location: '',
    feedback: '',
    interviewer: '',
    notes: '',
    rating: 0
  });

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const fetchCompaniesFromSupabase = useCallback(async () => {
    setLoadError(null);
    try {
      // 1) Fetch companies
      const { data: companiesRows, error: companiesErr } = await supabase
        .from('ipo_selection_companies')
        .select(`
          id,
          name,
          industry,
          size,
          location,
          applied_date,
          status,
          current_stage,
          priority,
          notes,
          last_update,
          overall_rating,
          tags,
          job_title,
          job_salary,
          job_benefits,
          job_requirements,
          job_description
        `)
        .order('last_update', { ascending: false });

      if (companiesErr) throw companiesErr;

      if (!companiesRows || companiesRows.length === 0) {
        setCompanies([]);
        return;
      }

      const ids = companiesRows.map((c: any) => c.id);

      // 2) Fetch related stages
      const { data: stagesRows, error: stagesErr } = await supabase
        .from('ipo_selection_stages')
        .select(`
          id,
          company_id,
          name,
          status,
          date,
          time,
          location,
          feedback,
          interviewer,
          notes,
          rating,
          preparation,
          completed_at
        `)
        .in('company_id', ids);

      if (stagesErr) throw stagesErr;

      // 3) Fetch related contacts
      const { data: contactsRows, error: contactsErr } = await supabase
        .from('ipo_selection_contacts')
        .select(`
          id,
          company_id,
          name,
          role,
          email,
          phone
        `)
        .in('company_id', ids);

      if (contactsErr) throw contactsErr;

      // 4) Map to Company[]
      const mapped: Company[] = companiesRows.map((row: any) => {
        const companyStages = (stagesRows || []).filter((s: any) => s.company_id === row.id).map((s: any) => ({
          id: String(s.id),
          name: s.name,
          status: (s.status ?? 'pending') as SelectionStage['status'],
          date: s.date ?? undefined,
          time: s.time ?? undefined,
          location: s.location ?? undefined,
          feedback: s.feedback ?? undefined,
          interviewer: s.interviewer ?? undefined,
          notes: s.notes ?? undefined,
          documents: undefined,
          preparation: Array.isArray(s.preparation) ? s.preparation as string[] : undefined,
          rating: s.rating ?? undefined,
          completedAt: s.completed_at ?? undefined,
        })) as SelectionStage[];

        const companyContacts = (contactsRows || []).filter((c: any) => c.company_id === row.id).map((c: any) => ({
          name: c.name,
          role: c.role,
          email: c.email ?? undefined,
          phone: c.phone ?? undefined,
        }));

        return {
          id: String(row.id),
          name: row.name,
          industry: row.industry ?? '',
          size: (row.size ?? 'large') as Company['size'],
          location: row.location ?? '',
          appliedDate: row.applied_date ?? '',
          status: (row.status ?? 'applied') as Company['status'],
          currentStage: Number(row.current_stage ?? 0),
          stages: companyStages,
          priority: (row.priority ?? 'medium') as Company['priority'],
          notes: row.notes ?? '',
          contacts: companyContacts,
          jobDetails: {
            title: row.job_title ?? '',
            salary: row.job_salary ?? undefined,
            benefits: Array.isArray(row.job_benefits) ? row.job_benefits as string[] : undefined,
            requirements: Array.isArray(row.job_requirements) ? row.job_requirements as string[] : undefined,
            description: row.job_description ?? undefined,
          },
          lastUpdate: row.last_update ?? '',
          overallRating: row.overall_rating ?? undefined,
          tags: Array.isArray(row.tags) ? row.tags as string[] : [],
        } as Company;
      });

      setCompanies(mapped);
    } catch (e: any) {
      console.warn('[selection] Supabase fetch failed, keeping local state:', e?.message);
      setLoadError('サーバーからの取得に失敗しました');
    }
  }, []);

  // Initialize: fetch from Supabase only (no mock fallback)
  useEffect(() => {
    fetchCompaniesFromSupabase();
  }, [fetchCompaniesFromSupabase]);


  // Memoized filtered and sorted companies
  const filteredAndSortedCompanies = useMemo(() => {
    let filtered = companies.filter(company => {
      const matchesSearch = company.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           company.industry.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           company.jobDetails.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           company.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesStatus = statusFilter === 'all' || company.status === statusFilter;
      const matchesPriority = priorityFilter === 'all' || company.priority === priorityFilter;
      
      return matchesSearch && matchesStatus && matchesPriority;
    });

    // Sort companies
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'date':
          comparison = new Date(a.appliedDate).getTime() - new Date(b.appliedDate).getTime();
          break;
        case 'priority':
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          comparison = priorityOrder[a.priority] - priorityOrder[b.priority];
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [companies, searchQuery, statusFilter, priorityFilter, sortBy, sortOrder]);

  // Statistics
  const stats = useMemo(() => {
    return {
      total: companies.length,
      inProgress: companies.filter(c => c.status === 'in_progress' || c.status === 'final_interview').length,
      offers: companies.filter(c => c.status === 'offer').length,
      rejected: companies.filter(c => c.status === 'rejected').length,
      averageRating: companies.filter(c => c.overallRating).length > 0 ? 
        Math.round(companies.filter(c => c.overallRating).reduce((acc, c) => acc + (c.overallRating || 0), 0) / 
        companies.filter(c => c.overallRating).length * 10) / 10 : 0
    };
  }, [companies]);

  // Form handlers
  const resetCompanyForm = useCallback(() => {
    setCompanyForm({
      name: '',
      industry: '',
      size: 'large',
      location: '',
      priority: 'medium',
      jobTitle: '',
      salary: '',
      description: '',
      notes: '',
      tags: ''
    });
  }, []);

  const resetStageForm = useCallback(() => {
    setStageForm({
      name: '',
      status: 'pending',
      date: '',
      time: '',
      location: '',
      feedback: '',
      interviewer: '',
      notes: '',
      rating: 0
    });
  }, []);

  // Company CRUD operations
  const handleAddCompany = useCallback(async () => {
    if (!companyForm.name.trim() || !companyForm.jobTitle.trim()) {
      alert('企業名と職種は必須です。');
      return;
    }

    const nowDate = new Date().toISOString().split('T')[0];

    try {
      // Insert into Supabase
      const { data: inserted, error } = await supabase
        .from('ipo_selection_companies')
        .insert({
          name: companyForm.name,
          industry: companyForm.industry || null,
          size: companyForm.size,
          location: companyForm.location || null,
          applied_date: nowDate,
          status: 'applied',
          current_stage: 0,
          priority: companyForm.priority,
          notes: companyForm.notes || null,
          last_update: nowDate,
          overall_rating: null,
          tags: companyForm.tags ? companyForm.tags.split(',').map(t => t.trim()) : [],
          job_title: companyForm.jobTitle,
          job_salary: companyForm.salary || null,
          job_description: companyForm.description || null,
        })
        .select('id')
        .single();

      const newId = inserted?.id ? String(inserted.id) : Date.now().toString();

      const newCompany: Company = {
        id: newId,
        name: companyForm.name,
        industry: companyForm.industry,
        size: companyForm.size,
        location: companyForm.location,
        appliedDate: nowDate,
        status: 'applied',
        currentStage: 0,
        priority: companyForm.priority,
        notes: companyForm.notes,
        lastUpdate: nowDate,
        overallRating: undefined,
        tags: companyForm.tags ? companyForm.tags.split(',').map(t => t.trim()) : [],
        stages: [
          {
            id: `${newId}-entry`,
            name: 'エントリー',
            status: 'passed',
            date: nowDate,
            completedAt: nowDate,
            feedback: 'エントリー完了',
            rating: 5
          }
        ],
        contacts: [],
        jobDetails: {
          title: companyForm.jobTitle,
          salary: companyForm.salary,
          description: companyForm.description
        }
      };

      setCompanies(prev => [...prev, newCompany]);
      setShowAddCompanyDialog(false);
      resetCompanyForm();
    } catch (e: any) {
      console.warn('[selection] insert failed, adding locally:', e?.message);
      // Fallback to local add
      const newCompany: Company = {
        id: Date.now().toString(),
        name: companyForm.name,
        industry: companyForm.industry,
        size: companyForm.size,
        location: companyForm.location,
        appliedDate: nowDate,
        status: 'applied',
        currentStage: 0,
        priority: companyForm.priority,
        notes: companyForm.notes,
        lastUpdate: nowDate,
        overallRating: undefined,
        tags: companyForm.tags ? companyForm.tags.split(',').map(t => t.trim()) : [],
        stages: [
          {
            id: `${Date.now()}-1`,
            name: 'エントリー',
            status: 'passed',
            date: nowDate,
            completedAt: nowDate,
            feedback: 'エントリー完了',
            rating: 5
          }
        ],
        contacts: [],
        jobDetails: {
          title: companyForm.jobTitle,
          salary: companyForm.salary,
          description: companyForm.description
        }
      };
      setCompanies(prev => [...prev, newCompany]);
      setShowAddCompanyDialog(false);
      resetCompanyForm();
    }
  }, [companyForm, resetCompanyForm]);

  const handleEditCompany = useCallback(async () => {
    if (!selectedCompany || !companyForm.name.trim() || !companyForm.jobTitle.trim()) {
      alert('企業名と職種は必須です。');
      return;
    }

    const nowDate = new Date().toISOString().split('T')[0];

    const updatedCompany: Company = {
      ...selectedCompany,
      name: companyForm.name,
      industry: companyForm.industry,
      size: companyForm.size,
      location: companyForm.location,
      priority: companyForm.priority,
      notes: companyForm.notes,
      tags: companyForm.tags ? companyForm.tags.split(',').map(t => t.trim()) : [],
      jobDetails: {
        ...selectedCompany.jobDetails,
        title: companyForm.jobTitle,
        salary: companyForm.salary,
        description: companyForm.description
      },
      lastUpdate: nowDate
    };

    try {
      await supabase
        .from('ipo_selection_companies')
        .update({
          name: updatedCompany.name,
          industry: updatedCompany.industry,
          size: updatedCompany.size,
          location: updatedCompany.location,
          priority: updatedCompany.priority,
          notes: updatedCompany.notes,
          last_update: nowDate,
          tags: updatedCompany.tags,
          job_title: updatedCompany.jobDetails.title,
          job_salary: updatedCompany.jobDetails.salary || null,
          job_description: updatedCompany.jobDetails.description || null,
        })
        .eq('id', selectedCompany.id);
    } catch (e: any) {
      console.warn('[selection] update failed (local state still updated):', e?.message);
    }

    setCompanies(prev => prev.map(c => c.id === selectedCompany.id ? updatedCompany : c));
    setSelectedCompany(updatedCompany);
    setShowEditCompanyDialog(false);
    resetCompanyForm();
  }, [selectedCompany, companyForm, resetCompanyForm]);

  const handleDeleteCompany = useCallback(async (companyId: string) => {
    if (confirm('この企業を削除しますか？')) {
      try {
        await supabase.from('ipo_selection_companies').delete().eq('id', companyId);
        await supabase.from('ipo_selection_stages').delete().eq('company_id', companyId);
        await supabase.from('ipo_selection_contacts').delete().eq('company_id', companyId);
      } catch (e: any) {
        console.warn('[selection] delete failed (removing locally):', e?.message);
      }
      setCompanies(prev => prev.filter(c => c.id !== companyId));
      if (selectedCompany?.id === companyId) {
        setSelectedCompany(null);
        setShowCompanyDialog(false);
      }
    }
  }, [selectedCompany]);

  // Stage operations
  const handleAddStage = useCallback(async (companyId: string, stageName: string) => {
    const company = companies.find(c => c.id === companyId);
    if (!company) return;

    const nowDate = new Date().toISOString().split('T')[0];
    let newStageId = `${companyId}-${Date.now()}`;

    try {
      const { data: inserted, error } = await supabase
        .from('ipo_selection_stages')
        .insert({
          company_id: companyId,
          name: stageName,
          status: 'pending',
          date: null,
          time: null,
          location: null,
          feedback: null,
          interviewer: null,
          notes: null,
          rating: null,
          preparation: [],
          completed_at: null
        })
        .select('id')
        .single();

      if (!error && inserted?.id) {
        newStageId = String(inserted.id);
      }
    } catch (e: any) {
      console.warn('[selection] add stage failed (adding locally):', e?.message);
    }

    const newStage: SelectionStage = {
      id: newStageId,
      name: stageName,
      status: 'pending'
    };

    const updatedCompany = {
      ...company,
      stages: [...company.stages, newStage],
      lastUpdate: nowDate
    };

    setCompanies(prev => prev.map(c => c.id === companyId ? updatedCompany : c));
    if (selectedCompany?.id === companyId) {
      setSelectedCompany(updatedCompany);
    }
  }, [companies, selectedCompany]);

  const handleUpdateStage = useCallback(async () => {
    if (!selectedStage || !selectedCompany) return;

    const updatedStages = selectedCompany.stages.map(stage => 
      stage.id === selectedStage.id 
        ? {
            ...stage,
            name: stageForm.name,
            status: stageForm.status,
            date: stageForm.date,
            time: stageForm.time,
            location: stageForm.location,
            feedback: stageForm.feedback,
            interviewer: stageForm.interviewer,
            notes: stageForm.notes,
            rating: stageForm.rating || undefined,
            completedAt: stageForm.status === 'passed' || stageForm.status === 'failed' 
              ? new Date().toISOString().split('T')[0] 
              : stage.completedAt
          }
        : stage
    );

    const updatedCompany = {
      ...selectedCompany,
      stages: updatedStages,
      lastUpdate: new Date().toISOString().split('T')[0]
    };

    try {
      await supabase
        .from('ipo_selection_stages')
        .update({
          name: stageForm.name,
          status: stageForm.status,
          date: stageForm.date || null,
          time: stageForm.time || null,
          location: stageForm.location || null,
          feedback: stageForm.feedback || null,
          interviewer: stageForm.interviewer || null,
          notes: stageForm.notes || null,
          rating: stageForm.rating || null,
          completed_at: (stageForm.status === 'passed' || stageForm.status === 'failed') 
            ? new Date().toISOString().split('T')[0]
            : null,
        })
        .eq('id', selectedStage.id);
    } catch (e: any) {
      console.warn('[selection] stage update failed (local state updated):', e?.message);
    }

    setCompanies(prev => prev.map(c => c.id === selectedCompany.id ? updatedCompany : c));
    setSelectedCompany(updatedCompany);
    setShowStageDialog(false);
    resetStageForm();
  }, [selectedStage, selectedCompany, stageForm, resetStageForm]);

  const handleDeleteStage = useCallback(async (stageId: string) => {
    if (!selectedCompany) return;
    
    if (confirm('この選考段階を削除しますか？')) {
      try {
        await supabase.from('ipo_selection_stages').delete().eq('id', stageId);
      } catch (e: any) {
        console.warn('[selection] stage delete failed (removing locally):', e?.message);
      }

      const updatedStages = selectedCompany.stages.filter(s => s.id !== stageId);
      const updatedCompany = {
        ...selectedCompany,
        stages: updatedStages,
        lastUpdate: new Date().toISOString().split('T')[0]
      };
      
      setCompanies(prev => prev.map(c => c.id === selectedCompany.id ? updatedCompany : c));
      setSelectedCompany(updatedCompany);
    }
  }, [selectedCompany]);

  // Dialog handlers
  const openCompanyDialog = useCallback((company: Company) => {
    setSelectedCompany(company);
    setShowCompanyDialog(true);
  }, []);

  const openEditCompanyDialog = useCallback((company: Company) => {
    setCompanyForm({
      name: company.name,
      industry: company.industry,
      size: company.size,
      location: company.location,
      priority: company.priority,
      jobTitle: company.jobDetails.title,
      salary: company.jobDetails.salary || '',
      description: company.jobDetails.description || '',
      notes: company.notes,
      tags: company.tags.join(', ')
    });
    setSelectedCompany(company);
    setShowEditCompanyDialog(true);
  }, []);

  const openStageEditDialog = useCallback((stage: SelectionStage) => {
    setSelectedStage(stage);
    setStageForm({
      name: stage.name,
      status: stage.status,
      date: stage.date || '',
      time: stage.time || '',
      location: stage.location || '',
      feedback: stage.feedback || '',
      interviewer: stage.interviewer || '',
      notes: stage.notes || '',
      rating: stage.rating || 0
    });
    setShowStageDialog(true);
  }, []);

  // Components
  const CompactCard = ({ company }: { company: Company }) => {
    const statusConfig = STATUS_CONFIG[company.status];
    const priorityConfig = PRIORITY_CONFIG[company.priority];
    const sizeConfig = COMPANY_SIZES[company.size];
    const currentStage = company.stages[company.currentStage] || company.stages[company.stages.length - 1];
    const progressPercentage = (company.currentStage + 1) / company.stages.length * 100;
    const StatusIcon = statusConfig.icon;
    const PriorityIcon = priorityConfig.icon;
    
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        whileHover={{ scale: 1.02 }}
      >
        <Card className="cursor-pointer bg-white border border-gray-200 hover:border-gray-300 hover:shadow-lg transition-all duration-200 overflow-hidden h-32 sm:h-36">
          <CardContent className="p-3 h-full">
            {/* Priority Color Bar */}
            <div className={`h-0.5 bg-gradient-to-r ${priorityConfig.gradient} mb-2`} />
            
            <div className="h-full flex flex-col">
              {/* Header - Compressed */}
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-gray-900 truncate group-hover:text-blue-600 transition-colors mb-1">
                    {company.name}
                  </h3>
                  <p className="text-xs text-gray-600 truncate">{company.jobDetails.title}</p>
                </div>
                
                <div className="flex items-center space-x-1 ml-2">
                  <Badge className={`${statusConfig.color} border text-xs px-1.5 py-0.5`}>
                    <StatusIcon className="w-2.5 h-2.5 mr-0.5" />
                    {isMobile ? statusConfig.shortLabel : statusConfig.label}
                  </Badge>
                </div>
              </div>

              {/* Info Row */}
              <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                <span className="flex items-center truncate">
                  <Building className="w-2.5 h-2.5 mr-1" />
                  {company.industry}
                </span>
                <span className="flex items-center ml-2">
                  <Badge className={`${priorityConfig.color} border text-xs px-1`}>
                    {isMobile ? priorityConfig.shortLabel : priorityConfig.label}
                  </Badge>
                </span>
              </div>

              {/* Progress - Compressed */}
              <div className="mb-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-600">
                    {company.currentStage + 1}/{company.stages.length}
                  </span>
                  {company.overallRating && (
                    <div className="flex items-center space-x-1">
                      <Star className="w-2.5 h-2.5 text-yellow-500 fill-current" />
                      <span className="text-xs text-gray-600">{company.overallRating}</span>
                    </div>
                  )}
                </div>
                <div className="relative">
                  <Progress value={progressPercentage} className="h-1.5 bg-gray-100" />
                  <div 
                    className={`absolute top-0 left-0 h-1.5 rounded-full bg-gradient-to-r ${statusConfig.gradient}`}
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
              </div>

              {/* Current Stage - Ultra Compressed */}
              {currentStage && (
                <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                  <span className="truncate">{currentStage.name}</span>
                  <div className={`w-2 h-2 rounded-full ml-1 ${
                    currentStage.status === 'passed' ? 'bg-green-500' :
                    currentStage.status === 'failed' ? 'bg-red-500' :
                    currentStage.status === 'scheduled' ? 'bg-blue-500' :
                    'bg-gray-300'
                  }`} />
                </div>
              )}

              {/* Action Row */}
              <div className="flex items-center justify-between mt-auto">
                <div className="text-xs text-gray-500 truncate">
                  {company.lastUpdate}
                </div>
                <div className="flex space-x-1 ml-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      openEditCompanyDialog(company);
                    }}
                  >
                    <Edit3 className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-1 text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      openCompanyDialog(company);
                    }}
                  >
                    <Eye className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  const MobileFiltersSheet = () => (
    <Sheet open={showMobileFilters} onOpenChange={setShowMobileFilters}>
      <SheetContent side="bottom" className="h-[70vh]">
        <SheetHeader>
          <SheetTitle>フィルター・並び替え</SheetTitle>
          <SheetDescription>
            検索条件を設定して企業を絞り込みます
          </SheetDescription>
        </SheetHeader>
        
        <ScrollArea className="h-full py-4">
          <div className="space-y-4">
            {/* Search */}
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-1.5 block">検索</Label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="企業名、業界、職種で検索..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            {/* Status & Priority Filters */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-1.5 block">選考状況</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="選考状況" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全て</SelectItem>
                    {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center space-x-2">
                          <config.icon className="w-3 h-3" />
                          <span>{config.shortLabel}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-1.5 block">優先度</Label>
                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="優先度" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全て</SelectItem>
                    {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center space-x-2">
                          <config.icon className="w-3 h-3" />
                          <span>{config.shortLabel}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Sort */}
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-1.5 block">並び替え</Label>
              <div className="space-y-2">
                <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="並び替え基準" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date">応募日</SelectItem>
                    <SelectItem value="name">企業名</SelectItem>
                    <SelectItem value="priority">優先度</SelectItem>
                    <SelectItem value="status">選考状況</SelectItem>
                  </SelectContent>
                </Select>
                
                <div className="flex items-center space-x-2">
                  <Button
                    variant={sortOrder === 'asc' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSortOrder('asc')}
                    className="flex-1 h-8"
                  >
                    <SortAsc className="w-3 h-3 mr-1" />
                    昇順
                  </Button>
                  <Button
                    variant={sortOrder === 'desc' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSortOrder('desc')}
                    className="flex-1 h-8"
                  >
                    <SortDesc className="w-3 h-3 mr-1" />
                    降順
                  </Button>
                </div>
              </div>
            </div>
            
            <div className="pt-3 border-t">
              <Button 
                onClick={() => setShowMobileFilters(false)}
                className="w-full h-10"
              >
                適用
              </Button>
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Compact Header */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-40 backdrop-blur-sm bg-white/80">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/ipo/dashboard')}
                className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-xl"
              >
                <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
              </Button>
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-gray-900">選考管理</h1>
                <p className="text-xs text-gray-600 hidden sm:block">
                  企業の選考状況を一元管理
                </p>
                {loadError && (
                  <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-0.5 mt-1 inline-block">
                    {loadError}
                  </p>
                )}
              </div>
            </div>
            
            <div className="flex items-center space-x-1.5 sm:space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowMobileFilters(true)}
                className="flex items-center space-x-1 h-8 px-2 sm:px-3"
              >
                <Filter className="w-3 h-3 sm:w-4 sm:h-4" />
                {!isMobile && <span>絞り込み</span>}
              </Button>
              
              {!isMobile && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                  className="flex items-center space-x-1 h-8 px-3"
                >
                  {viewMode === 'grid' ? (
                    <>
                      <List className="w-4 h-4" />
                      <span>リスト</span>
                    </>
                  ) : (
                    <>
                      <Grid className="w-4 h-4" />
                      <span>グリッド</span>
                    </>
                  )}
                </Button>
              )}
              
              <Button 
                onClick={() => setShowAddCompanyDialog(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm h-8 px-2 sm:px-3"
              >
                <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                <span className="hidden xs:inline">企業追加</span>
                <span className="xs:hidden">追加</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-6">
        {/* Horizontal Scrolling Stats Cards */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-4 sm:mb-6"
        >
          <ScrollArea className="w-full">
            <div className="flex space-x-3 pb-2">
              {[
                { 
                  label: '総応募数', 
                  value: stats.total, 
                  color: 'text-blue-600',
                  bgColor: 'bg-blue-50',
                  icon: Briefcase
                },
                { 
                  label: '選考中', 
                  value: stats.inProgress, 
                  color: 'text-yellow-600',
                  bgColor: 'bg-yellow-50',
                  icon: Timer
                },
                { 
                  label: '内定', 
                  value: stats.offers, 
                  color: 'text-green-600',
                  bgColor: 'bg-green-50',
                  icon: Award
                },
                { 
                  label: '不合格', 
                  value: stats.rejected, 
                  color: 'text-red-600',
                  bgColor: 'bg-red-50',
                  icon: XCircle
                },
                { 
                  label: '平均評価', 
                  value: stats.averageRating, 
                  color: 'text-purple-600',
                  bgColor: 'bg-purple-50',
                  icon: Star
                }
              ].map(({ label, value, color, bgColor, icon: Icon }, index) => (
                <motion.div
                  key={label}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.2, delay: index * 0.05 }}
                  className="flex-shrink-0"
                >
                  <Card className="p-3 text-center hover:shadow-md transition-shadow w-20 sm:w-24">
                    <div className={`inline-flex items-center justify-center w-6 h-6 sm:w-8 sm:h-8 rounded-lg ${bgColor} mb-1.5`}>
                      <Icon className={`w-3 h-3 sm:w-4 sm:h-4 ${color}`} />
                    </div>
                    <div className={`text-lg sm:text-xl font-bold ${color} mb-0.5`}>
                      {value}
                    </div>
                    <div className="text-xs text-gray-600">{label}</div>
                  </Card>
                </motion.div>
              ))}
            </div>
          </ScrollArea>
        </motion.div>

        {/* Desktop Filters - Compact */}
        {!isMobile && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <Card className="p-3 sm:p-4 mb-4 sm:mb-6">
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                <div className="lg:col-span-2">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <Input
                      placeholder="企業名、業界、職種、タグで検索..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 h-9"
                    />
                  </div>
                </div>
                
                <div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="選考状況" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全ての状況</SelectItem>
                      {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                        <SelectItem key={key} value={key}>
                          <div className="flex items-center space-x-2">
                            <config.icon className="w-4 h-4" />
                            <span>{config.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="優先度" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全ての優先度</SelectItem>
                      {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
                        <SelectItem key={key} value={key}>
                          <div className="flex items-center space-x-2">
                            <config.icon className="w-4 h-4" />
                            <span>{config.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="w-full justify-between h-9">
                        並び替え
                        <ChevronDown className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                      <DropdownMenuItem onClick={() => { setSortBy('date'); setSortOrder('desc'); }}>
                        <Calendar className="w-4 h-4 mr-2" />
                        応募日（新順）
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => { setSortBy('date'); setSortOrder('asc'); }}>
                        <Calendar className="w-4 h-4 mr-2" />
                        応募日（古順）
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => { setSortBy('name'); setSortOrder('asc'); }}>
                        企業名（A-Z）
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => { setSortBy('priority'); setSortOrder('desc'); }}>
                        優先度（高順）
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Companies Grid - Compact */}
        <AnimatePresence mode="wait">
          {filteredAndSortedCompanies.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <Card className="p-6 sm:p-8 text-center">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Briefcase className="w-6 h-6 text-gray-400" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">企業がありません</h3>
                <p className="text-sm text-gray-600 mb-4 max-w-md mx-auto">
                  {searchQuery || statusFilter !== 'all' || priorityFilter !== 'all' 
                    ? '検索条件に一致する企業が見つかりません' 
                    : '最初の企業を追加して選考管理を始めましょう'}
                </p>
                <Button 
                  onClick={() => setShowAddCompanyDialog(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  企業を追加
                </Button>
              </Card>
            </motion.div>
          ) : (
            <motion.div
              key="companies"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            >
              {filteredAndSortedCompanies.map((company, index) => (
                <motion.div
                  key={company.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: index * 0.02 }}
                  onClick={() => openCompanyDialog(company)}
                >
                  <CompactCard company={company} />
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Mobile Filters Sheet */}
      <MobileFiltersSheet />

      {/* Company Detail Dialog */}
      <Dialog open={showCompanyDialog} onOpenChange={setShowCompanyDialog}>
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
          {selectedCompany && (
            <>
              <DialogHeader className="pb-4 border-b flex-shrink-0">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <DialogTitle className="text-xl sm:text-2xl truncate">{selectedCompany.name}</DialogTitle>
                    <DialogDescription className="text-sm sm:text-base truncate">
                      {selectedCompany.jobDetails.title} • {selectedCompany.industry}
                    </DialogDescription>
                  </div>
                  <div className="flex items-center space-x-2 ml-4 flex-shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditCompanyDialog(selectedCompany)}
                    >
                      <Edit3 className="w-4 h-4 mr-1" />
                      <span className="hidden sm:inline">編集</span>
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleDeleteCompany(selectedCompany.id)}>
                          <Trash2 className="w-4 h-4 mr-2" />
                          削除
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </DialogHeader>

              <div className="flex-1 overflow-hidden">
                <Tabs defaultValue="overview" className="h-full flex flex-col">
                  <TabsList className="grid w-full grid-cols-4 h-10 flex-shrink-0">
                    <TabsTrigger value="overview" className="text-xs sm:text-sm">概要</TabsTrigger>
                    <TabsTrigger value="stages" className="text-xs sm:text-sm">選考段階</TabsTrigger>
                    <TabsTrigger value="contacts" className="text-xs sm:text-sm">連絡先</TabsTrigger>
                    <TabsTrigger value="notes" className="text-xs sm:text-sm">メモ</TabsTrigger>
                  </TabsList>

                  <div className="flex-1 overflow-hidden">
                    <ScrollArea className="h-full">
                      <TabsContent value="overview" className="mt-4 space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <Card className="p-4">
                            <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                              <Building className="w-4 h-4 mr-2" />
                              企業情報
                            </h4>
                            <div className="space-y-2">
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600">業界:</span>
                                <span className="text-sm font-medium">{selectedCompany.industry}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600">規模:</span>
                                <span className="text-sm font-medium">{COMPANY_SIZES[selectedCompany.size].label}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600">所在地:</span>
                                <span className="text-sm font-medium">{selectedCompany.location}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600">応募日:</span>
                                <span className="text-sm font-medium">{selectedCompany.appliedDate}</span>
                              </div>
                            </div>
                          </Card>

                          <Card className="p-4">
                            <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                              <Briefcase className="w-4 h-4 mr-2" />
                              職務情報
                            </h4>
                            <div className="space-y-2">
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600">職種:</span>
                                <span className="text-sm font-medium">{selectedCompany.jobDetails.title}</span>
                              </div>
                              {selectedCompany.jobDetails.salary && (
                                <div className="flex justify-between items-center">
                                  <span className="text-sm text-gray-600">想定年収:</span>
                                  <span className="text-sm font-medium">{selectedCompany.jobDetails.salary}</span>
                                </div>
                              )}
                              {selectedCompany.overallRating && (
                                <div className="flex justify-between items-center">
                                  <span className="text-sm text-gray-600">評価:</span>
                                  <div className="flex items-center space-x-1">
                                    <Star className="w-4 h-4 text-yellow-500 fill-current" />
                                    <span className="text-sm font-medium">{selectedCompany.overallRating}/5</span>
                                  </div>
                                </div>
                              )}
                            </div>
                            
                            {selectedCompany.jobDetails.description && (
                              <div className="mt-3 pt-3 border-t border-gray-100">
                                <span className="text-sm font-medium text-gray-600 block mb-1">職務内容:</span>
                                <p className="text-sm text-gray-800 leading-relaxed">{selectedCompany.jobDetails.description}</p>
                              </div>
                            )}
                          </Card>
                        </div>

                        {selectedCompany.jobDetails.requirements && selectedCompany.jobDetails.requirements.length > 0 && (
                          <Card className="p-4">
                            <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                              <CheckCircle className="w-4 h-4 mr-2" />
                              応募要件
                            </h4>
                            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                              {selectedCompany.jobDetails.requirements.map((req, index) => (
                                <li key={index} className="flex items-start space-x-2 text-sm text-gray-700">
                                  <div className="w-1 h-1 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                                  <span>{req}</span>
                                </li>
                              ))}
                            </ul>
                          </Card>
                        )}

                        {selectedCompany.jobDetails.benefits && selectedCompany.jobDetails.benefits.length > 0 && (
                          <Card className="p-4">
                            <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                              <Heart className="w-4 h-4 mr-2" />
                              福利厚生
                            </h4>
                            <div className="flex flex-wrap gap-1">
                              {selectedCompany.jobDetails.benefits.map((benefit, index) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {benefit}
                                </Badge>
                              ))}
                            </div>
                          </Card>
                        )}
                      </TabsContent>

                      <TabsContent value="stages" className="mt-4 space-y-3">
                        <div className="flex justify-between items-center">
                          <h4 className="text-lg font-medium">選考段階</h4>
                          <Button
                            size="sm"
                            onClick={() => handleAddStage(selectedCompany.id, '新しい段階')}
                          >
                            <Plus className="w-4 h-4 mr-1" />
                            段階を追加
                          </Button>
                        </div>

                        {selectedCompany.stages.length === 0 ? (
                          <Card className="p-6 text-center">
                            <p className="text-gray-500 mb-3">選考段階がまだ登録されていません</p>
                            <Button
                              size="sm"
                              onClick={() => handleAddStage(selectedCompany.id, '新しい段階')}
                            >
                              <Plus className="w-4 h-4 mr-1" />
                              最初の段階を追加
                            </Button>
                          </Card>
                        ) : (
                          selectedCompany.stages.map((stage, index) => {
                            const isActive = index === selectedCompany.currentStage;
                            return (
                              <Card key={stage.id} className={`p-4 ${isActive ? 'ring-2 ring-blue-500 bg-blue-50/50' : ''}`}>
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center space-x-2 mb-2">
                                      <div className={`w-2.5 h-2.5 rounded-full ${
                                        stage.status === 'passed' ? 'bg-green-500' :
                                        stage.status === 'failed' ? 'bg-red-500' :
                                        stage.status === 'scheduled' ? 'bg-blue-500' :
                                        'bg-gray-300'
                                      }`} />
                                      <h5 className="font-medium text-gray-900 text-sm">{stage.name}</h5>
                                      <Badge className={`text-xs ${
                                        stage.status === 'passed' ? 'bg-green-100 text-green-800' :
                                        stage.status === 'failed' ? 'bg-red-100 text-red-800' :
                                        stage.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                                        'bg-gray-100 text-gray-800'
                                      }`}>
                                        {stage.status === 'passed' ? '通過' :
                                         stage.status === 'failed' ? '不通過' :
                                         stage.status === 'scheduled' ? '予定' : '待機中'}
                                      </Badge>
                                      {isActive && (
                                        <Badge className="bg-blue-100 text-blue-800 text-xs">
                                          現在
                                        </Badge>
                                      )}
                                    </div>

                                    {(stage.date || stage.time || stage.location) && (
                                      <div className="text-xs text-gray-600 mb-2">
                                        {stage.date && (
                                          <div className="flex items-center space-x-1">
                                            <Calendar className="w-3 h-3" />
                                            <span>{stage.date}</span>
                                            {stage.time && <span>• {stage.time}</span>}
                                          </div>
                                        )}
                                        {stage.location && (
                                          <div className="flex items-center space-x-1 mt-1">
                                            <MapPin className="w-3 h-3" />
                                            <span>{stage.location}</span>
                                          </div>
                                        )}
                                      </div>
                                    )}

                                    {stage.interviewer && (
                                      <div className="text-xs text-gray-600 mb-2 flex items-center space-x-1">
                                        <User className="w-3 h-3" />
                                        <span>面接官: {stage.interviewer}</span>
                                      </div>
                                    )}

                                    {stage.feedback && (
                                      <div className="text-xs text-gray-700 bg-gray-50 p-2 rounded-lg mb-2">
                                        <p className="leading-relaxed">{stage.feedback}</p>
                                      </div>
                                    )}

                                    {stage.notes && (
                                      <div className="text-xs text-gray-700 bg-blue-50 p-2 rounded-lg mb-2">
                                        <p className="leading-relaxed">{stage.notes}</p>
                                      </div>
                                    )}

                                    {stage.preparation && stage.preparation.length > 0 && (
                                      <div className="text-xs">
                                        <span className="font-medium text-gray-600 block mb-1">準備事項:</span>
                                        <ul className="space-y-0.5">
                                          {stage.preparation.map((prep, i) => (
                                            <li key={i} className="flex items-start space-x-1 text-gray-700">
                                              <div className="w-1 h-1 bg-gray-400 rounded-full mt-1.5 flex-shrink-0" />
                                              <span>{prep}</span>
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}

                                    {stage.rating && (
                                      <div className="flex items-center space-x-1 text-xs mt-2">
                                        <span className="text-gray-600">評価:</span>
                                        <div className="flex items-center space-x-0.5">
                                          {[1, 2, 3, 4, 5].map(rating => (
                                            <Star 
                                              key={rating}
                                              className={`w-3 h-3 ${
                                                rating <= (stage.rating || 0) 
                                                  ? 'text-yellow-500 fill-current' 
                                                  : 'text-gray-300'
                                              }`}
                                            />
                                          ))}
                                          <span className="text-gray-600 ml-1">({stage.rating}/5)</span>
                                        </div>
                                      </div>
                                    )}
                                  </div>

                                  <div className="flex items-center space-x-1 ml-3">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => openStageEditDialog(stage)}
                                      className="h-7 w-7 p-0"
                                    >
                                      <Edit3 className="w-3 h-3" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleDeleteStage(stage.id)}
                                      className="h-7 w-7 p-0"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  </div>
                                </div>
                              </Card>
                            );
                          })
                        )}
                      </TabsContent>

                      <TabsContent value="contacts" className="mt-4 space-y-3">
                        <div className="flex justify-between items-center">
                          <h4 className="text-lg font-medium">連絡先</h4>
                        </div>

                        {selectedCompany.contacts.length === 0 ? (
                          <Card className="p-6 text-center">
                            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                              <Users className="w-6 h-6 text-gray-400" />
                            </div>
                            <p className="text-gray-500 text-sm">連絡先がまだ登録されていません</p>
                          </Card>
                        ) : (
                          <div className="grid gap-3 sm:grid-cols-2">
                            {selectedCompany.contacts.map((contact, index) => (
                              <Card key={index} className="p-4">
                                <div className="flex items-center space-x-3 mb-2">
                                  <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                                    <User className="w-4 h-4 text-gray-600" />
                                  </div>
                                  <div>
                                    <h5 className="font-medium text-gray-900 text-sm">{contact.name}</h5>
                                    <p className="text-xs text-gray-600">{contact.role}</p>
                                  </div>
                                </div>
                                <div className="space-y-1">
                                  {contact.email && (
                                    <div className="flex items-center space-x-1">
                                      <Mail className="w-3 h-3 text-gray-400" />
                                      <a 
                                        href={`mailto:${contact.email}`} 
                                        className="text-xs text-blue-600 hover:underline truncate"
                                      >
                                        {contact.email}
                                      </a>
                                    </div>
                                  )}
                                  {contact.phone && (
                                    <div className="flex items-center space-x-1">
                                      <Phone className="w-3 h-3 text-gray-400" />
                                      <a 
                                        href={`tel:${contact.phone}`} 
                                        className="text-xs text-blue-600 hover:underline"
                                      >
                                        {contact.phone}
                                      </a>
                                    </div>
                                  )}
                                </div>
                              </Card>
                            ))}
                          </div>
                        )}
                      </TabsContent>

                      <TabsContent value="notes" className="mt-4 space-y-4">
                        <div>
                          <h4 className="text-lg font-medium mb-3 flex items-center">
                            <MessageSquare className="w-4 h-4 mr-2" />
                            メモ・備考
                          </h4>
                          <Card className="p-4">
                            {selectedCompany.notes ? (
                              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                                {selectedCompany.notes}
                              </p>
                            ) : (
                              <p className="text-gray-500 text-center py-6 text-sm">
                                メモがまだ記録されていません
                              </p>
                            )}
                          </Card>
                        </div>

                        {selectedCompany.tags.length > 0 && (
                          <div>
                            <h4 className="text-lg font-medium mb-3">タグ</h4>
                            <Card className="p-4">
                              <div className="flex flex-wrap gap-1">
                                {selectedCompany.tags.map((tag, index) => (
                                  <Badge key={index} variant="outline" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            </Card>
                          </div>
                        )}
                      </TabsContent>
                    </ScrollArea>
                  </div>
                </Tabs>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Company Dialog */}
      <Dialog open={showAddCompanyDialog} onOpenChange={setShowAddCompanyDialog}>
        <DialogContent className="max-w-2xl h-[90vh] flex flex-col">
          <DialogHeader className="pb-4 border-b flex-shrink-0">
            <DialogTitle>新しい企業を追加</DialogTitle>
            <DialogDescription>
              企業情報と応募したポジションの詳細を入力してください。
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="flex-1 py-4">
            <div className="space-y-4 pr-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-1 block">企業名 *</Label>
                  <Input
                    value={companyForm.name}
                    onChange={(e) => setCompanyForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="例: Google Japan"
                    className="h-9"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-1 block">業界</Label>
                  <Select value={companyForm.industry} onValueChange={(value) => setCompanyForm(prev => ({ ...prev, industry: value }))}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="業界を選択" />
                    </SelectTrigger>
                    <SelectContent>
                      {INDUSTRIES.map((industry) => (
                        <SelectItem key={industry} value={industry}>{industry}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-1 block">企業規模</Label>
                  <Select value={companyForm.size} onValueChange={(value: any) => setCompanyForm(prev => ({ ...prev, size: value }))}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(COMPANY_SIZES).map(([key, config]) => (
                        <SelectItem key={key} value={key}>
                          <div className="flex items-center space-x-2">
                            <config.icon className="w-4 h-4" />
                            <span>{config.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-1 block">所在地</Label>
                  <Input
                    value={companyForm.location}
                    onChange={(e) => setCompanyForm(prev => ({ ...prev, location: e.target.value }))}
                    placeholder="例: 東京"
                    className="h-9"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-1 block">職種 *</Label>
                  <Input
                    value={companyForm.jobTitle}
                    onChange={(e) => setCompanyForm(prev => ({ ...prev, jobTitle: e.target.value }))}
                    placeholder="例: ソフトウェアエンジニア"
                    className="h-9"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-1 block">想定年収</Label>
                  <Input
                    value={companyForm.salary}
                    onChange={(e) => setCompanyForm(prev => ({ ...prev, salary: e.target.value }))}
                    placeholder="例: 600-800万円"
                    className="h-9"
                  />
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700 mb-1 block">優先度</Label>
                <Select value={companyForm.priority} onValueChange={(value: any) => setCompanyForm(prev => ({ ...prev, priority: value }))}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center space-x-2">
                          <config.icon className="w-4 h-4" />
                          <span>{config.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700 mb-1 block">タグ</Label>
                <Input
                  value={companyForm.tags}
                  onChange={(e) => setCompanyForm(prev => ({ ...prev, tags: e.target.value }))}
                  placeholder="カンマ区切りで入力（例: IT, グローバル, 大手）"
                  className="h-9"
                />
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700 mb-1 block">職務内容</Label>
                <Textarea
                  value={companyForm.description}
                  onChange={(e) => setCompanyForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="職務内容の詳細を入力..."
                  rows={2}
                />
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700 mb-1 block">メモ</Label>
                <Textarea
                  value={companyForm.notes}
                  onChange={(e) => setCompanyForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="志望動機、特記事項など..."
                  rows={2}
                />
              </div>
            </div>
          </ScrollArea>

          <div className="flex justify-end space-x-3 pt-4 border-t flex-shrink-0">
            <Button 
              variant="outline" 
              onClick={() => {
                setShowAddCompanyDialog(false);
                resetCompanyForm();
              }}
            >
              キャンセル
            </Button>
            <Button 
              onClick={handleAddCompany}
              disabled={!companyForm.name.trim() || !companyForm.jobTitle.trim()}
            >
              <Save className="w-4 h-4 mr-2" />
              追加
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Company Dialog */}
      <Dialog open={showEditCompanyDialog} onOpenChange={setShowEditCompanyDialog}>
        <DialogContent className="max-w-2xl h-[90vh] flex flex-col">
          <DialogHeader className="pb-4 border-b flex-shrink-0">
            <DialogTitle>企業情報を編集</DialogTitle>
            <DialogDescription>
              企業情報と応募したポジションの詳細を編集してください。
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="flex-1 py-4">
            <div className="space-y-4 pr-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-1 block">企業名 *</Label>
                  <Input
                    value={companyForm.name}
                    onChange={(e) => setCompanyForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="例: Google Japan"
                    className="h-9"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-1 block">業界</Label>
                  <Select value={companyForm.industry} onValueChange={(value) => setCompanyForm(prev => ({ ...prev, industry: value }))}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="業界を選択" />
                    </SelectTrigger>
                    <SelectContent>
                      {INDUSTRIES.map((industry) => (
                        <SelectItem key={industry} value={industry}>{industry}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-1 block">企業規模</Label>
                  <Select value={companyForm.size} onValueChange={(value: any) => setCompanyForm(prev => ({ ...prev, size: value }))}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(COMPANY_SIZES).map(([key, config]) => (
                        <SelectItem key={key} value={key}>
                          <div className="flex items-center space-x-2">
                            <config.icon className="w-4 h-4" />
                            <span>{config.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-1 block">所在地</Label>
                  <Input
                    value={companyForm.location}
                    onChange={(e) => setCompanyForm(prev => ({ ...prev, location: e.target.value }))}
                    placeholder="例: 東京"
                    className="h-9"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-1 block">職種 *</Label>
                  <Input
                    value={companyForm.jobTitle}
                    onChange={(e) => setCompanyForm(prev => ({ ...prev, jobTitle: e.target.value }))}
                    placeholder="例: ソフトウェアエンジニア"
                    className="h-9"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-1 block">想定年収</Label>
                  <Input
                    value={companyForm.salary}
                    onChange={(e) => setCompanyForm(prev => ({ ...prev, salary: e.target.value }))}
                    placeholder="例: 600-800万円"
                    className="h-9"
                  />
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700 mb-1 block">優先度</Label>
                <Select value={companyForm.priority} onValueChange={(value: any) => setCompanyForm(prev => ({ ...prev, priority: value }))}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center space-x-2">
                          <config.icon className="w-4 h-4" />
                          <span>{config.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700 mb-1 block">タグ</Label>
                <Input
                  value={companyForm.tags}
                  onChange={(e) => setCompanyForm(prev => ({ ...prev, tags: e.target.value }))}
                  placeholder="カンマ区切りで入力（例: IT, グローバル, 大手）"
                  className="h-9"
                />
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700 mb-1 block">職務内容</Label>
                <Textarea
                  value={companyForm.description}
                  onChange={(e) => setCompanyForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="職務内容の詳細を入力..."
                  rows={2}
                />
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700 mb-1 block">メモ</Label>
                <Textarea
                  value={companyForm.notes}
                  onChange={(e) => setCompanyForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="志望動機、特記事項など..."
                  rows={2}
                />
              </div>
            </div>
          </ScrollArea>

          <div className="flex justify-end space-x-3 pt-4 border-t flex-shrink-0">
            <Button 
              variant="outline" 
              onClick={() => {
                setShowEditCompanyDialog(false);
                resetCompanyForm();
              }}
            >
              キャンセル
            </Button>
            <Button onClick={handleEditCompany}>
              <Save className="w-4 h-4 mr-2" />
              更新
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Stage Dialog */}
      <Dialog open={showStageDialog} onOpenChange={setShowStageDialog}>
        <DialogContent className="max-w-2xl h-[90vh] flex flex-col">
          <DialogHeader className="pb-4 border-b flex-shrink-0">
            <DialogTitle>選考段階を編集</DialogTitle>
            <DialogDescription>
              選考段階の詳細を編集してください。
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="flex-1 py-4">
            <div className="space-y-4 pr-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-1 block">段階名</Label>
                  <Input
                    value={stageForm.name}
                    onChange={(e) => setStageForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="例: 一次面接"
                    className="h-9"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-1 block">状況</Label>
                  <Select value={stageForm.status} onValueChange={(value: any) => setStageForm(prev => ({ ...prev, status: value }))}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">待機中</SelectItem>
                      <SelectItem value="scheduled">予定</SelectItem>
                      <SelectItem value="passed">通過</SelectItem>
                      <SelectItem value="failed">不通過</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-1 block">日付</Label>
                  <Input
                    type="date"
                    value={stageForm.date}
                    onChange={(e) => setStageForm(prev => ({ ...prev, date: e.target.value }))}
                    className="h-9"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-1 block">時間</Label>
                  <Input
                    type="time"
                    value={stageForm.time}
                    onChange={(e) => setStageForm(prev => ({ ...prev, time: e.target.value }))}
                    className="h-9"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-1 block">場所</Label>
                  <Input
                    value={stageForm.location}
                    onChange={(e) => setStageForm(prev => ({ ...prev, location: e.target.value }))}
                    placeholder="例: オンライン、東京オフィス"
                    className="h-9"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-1 block">面接官</Label>
                  <Input
                    value={stageForm.interviewer}
                    onChange={(e) => setStageForm(prev => ({ ...prev, interviewer: e.target.value }))}
                    placeholder="例: 田中部長"
                    className="h-9"
                  />
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700 mb-1 block">評価 (1-5)</Label>
                <Select value={stageForm.rating.toString()} onValueChange={(value) => setStageForm(prev => ({ ...prev, rating: parseInt(value) }))}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">未評価</SelectItem>
                    <SelectItem value="1">1 - 非常に悪い</SelectItem>
                    <SelectItem value="2">2 - 悪い</SelectItem>
                    <SelectItem value="3">3 - 普通</SelectItem>
                    <SelectItem value="4">4 - 良い</SelectItem>
                    <SelectItem value="5">5 - 非常に良い</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700 mb-1 block">フィードバック</Label>
                <Textarea
                  value={stageForm.feedback}
                  onChange={(e) => setStageForm(prev => ({ ...prev, feedback: e.target.value }))}
                  placeholder="選考結果やフィードバックを入力..."
                  rows={2}
                />
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700 mb-1 block">メモ</Label>
                <Textarea
                  value={stageForm.notes}
                  onChange={(e) => setStageForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="面接の感想、準備内容など..."
                  rows={2}
                />
              </div>
            </div>
          </ScrollArea>

          <div className="flex justify-end space-x-3 pt-4 border-t flex-shrink-0">
            <Button 
              variant="outline" 
              onClick={() => {
                setShowStageDialog(false);
                resetStageForm();
              }}
            >
              キャンセル
            </Button>
            <Button onClick={handleUpdateStage}>
              <Save className="w-4 h-4 mr-2" />
              更新
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Add default export for SelectionPage at the end of the file
export default SelectionPage;