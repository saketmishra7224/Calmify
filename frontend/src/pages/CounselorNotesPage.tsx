import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Search, 
  Plus, 
  FileText, 
  Filter, 
  Calendar, 
  Tag, 
  Edit, 
  Trash2, 
  Save, 
  X,
  Clock,
  User,
  AlertTriangle,
  BookOpen,
  Target,
  Activity,
  Archive,
  CheckCircle,
  BarChart3
} from "lucide-react";
import { apiService } from "@/services/api";

interface Note {
  _id: string;
  title: string;
  content: string;
  type: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'draft' | 'finalized' | 'archived';
  tags: string[];
  followUpRequired: boolean;
  followUpDate?: string;
  followUpNotes?: string;
  patient: {
    _id: string;
    username: string;
    profile?: {
      firstName?: string;
      lastName?: string;
    };
  };
  session?: {
    _id: string;
    title: string;
    type: string;
    createdAt: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface NoteStats {
  summary: {
    totalNotes: number;
    draftNotes: number;
    finalizedNotes: number;
    urgentNotes: number;
    followUpRequired: number;
  };
  typeDistribution: Array<{
    _id: string;
    count: number;
  }>;
}

const NOTE_TYPES = [
  { value: 'session_note', label: 'Session Note', icon: FileText },
  { value: 'assessment', label: 'Assessment', icon: BarChart3 },
  { value: 'treatment_plan', label: 'Treatment Plan', icon: Target },
  { value: 'progress_note', label: 'Progress Note', icon: Activity },
  { value: 'risk_assessment', label: 'Risk Assessment', icon: AlertTriangle },
  { value: 'general', label: 'General', icon: BookOpen },
  { value: 'follow_up', label: 'Follow-up', icon: Clock },
  { value: 'referral', label: 'Referral', icon: Archive }
];

const PRIORITY_COLORS = {
  low: 'bg-green-100 text-green-800 border-green-200',
  medium: 'bg-blue-100 text-blue-800 border-blue-200',
  high: 'bg-orange-100 text-orange-800 border-orange-200',
  urgent: 'bg-red-100 text-red-800 border-red-200'
};

const STATUS_COLORS = {
  draft: 'bg-gray-100 text-gray-800 border-gray-200',
  finalized: 'bg-green-100 text-green-800 border-green-200',
  archived: 'bg-slate-100 text-slate-800 border-slate-200'
};

export default function CounselorNotesPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  // State management
  const [notes, setNotes] = useState<Note[]>([]);
  const [filteredNotes, setFilteredNotes] = useState<Note[]>([]);
  const [stats, setStats] = useState<NoteStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Search and filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [selectedPriority, setSelectedPriority] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  
  // Note creation/editing
  const [isCreating, setIsCreating] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    patientId: "",
    sessionId: "",
    type: "general",
    priority: "medium" as 'low' | 'medium' | 'high' | 'urgent',
    tags: [] as string[],
    followUpRequired: false,
    followUpDate: "",
    followUpNotes: "",
    status: "draft" as 'draft' | 'finalized' | 'archived'
  });
  const [tagInput, setTagInput] = useState("");
  
  // Patient search
  const [patientSearch, setPatientSearch] = useState("");
  const [patients, setPatients] = useState<Array<{_id: string; username: string; displayName: string}>>([]);
  const [selectedPatient, setSelectedPatient] = useState<{_id: string; username: string; displayName: string} | null>(null);
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    if (isLoading) return;
    
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    if (user?.role !== 'counselor') {
      navigate('/dashboard');
      return;
    }

    loadNotes();
    loadStats();
  }, [isAuthenticated, user, navigate, isLoading, currentPage]);

  // Apply filters when search query or filter options change
  useEffect(() => {
    applyFilters();
  }, [notes, searchQuery, selectedType, selectedPriority, selectedStatus]);

  // Search patients when search term changes
  useEffect(() => {
    const searchPatientsDebounced = async () => {
      if (patientSearch.trim().length >= 2) {
        try {
          const searchResults = await apiService.searchPatients(patientSearch, 10);
          setPatients(searchResults);
          setShowPatientDropdown(true);
        } catch (error) {
          console.error('Failed to search patients:', error);
          setPatients([]);
        }
      } else {
        setPatients([]);
        setShowPatientDropdown(false);
      }
    };

    const timeoutId = setTimeout(searchPatientsDebounced, 300);
    return () => clearTimeout(timeoutId);
  }, [patientSearch]);

  const loadNotes = async () => {
    try {
      setLoading(true);
      const response = await apiService.getNotes({
        page: currentPage,
        limit: 20,
        type: selectedType !== 'all' ? selectedType : undefined,
        priority: selectedPriority !== 'all' ? selectedPriority : undefined,
        status: selectedStatus !== 'all' ? selectedStatus : undefined
      });
      
      if (response.success) {
        setNotes(response.data.notes);
        setTotalPages(response.data.pagination.totalPages);
      }
    } catch (error) {
      console.error('Error loading notes:', error);
      setError('Failed to load notes');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await apiService.getNotesStats();
      if (response.success) {
        setStats(response.data);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const applyFilters = () => {
    let filtered = [...notes];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(note => 
        note.title.toLowerCase().includes(query) ||
        note.content.toLowerCase().includes(query) ||
        note.tags.some(tag => tag.toLowerCase().includes(query)) ||
        note.patient.username.toLowerCase().includes(query)
      );
    }

    // Apply type filter
    if (selectedType !== 'all') {
      filtered = filtered.filter(note => note.type === selectedType);
    }

    // Apply priority filter
    if (selectedPriority !== 'all') {
      filtered = filtered.filter(note => note.priority === selectedPriority);
    }

    // Apply status filter
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(note => note.status === selectedStatus);
    }

    setFilteredNotes(filtered);
  };

  const handleSelectPatient = (patient: {_id: string; username: string; displayName: string}) => {
    console.log('Selecting patient:', patient);
    setSelectedPatient(patient);
    setFormData(prev => {
      const updated = { ...prev, patientId: patient._id };
      console.log('Updated form data:', updated);
      return updated;
    });
    setPatientSearch(patient.displayName);
    setShowPatientDropdown(false);
  };

  const handleCreateNote = async () => {
    try {
      setLoading(true);
      const response = await apiService.createNote({
        title: formData.title,
        content: formData.content,
        patient: formData.patientId,
        session: formData.sessionId || undefined,
        type: formData.type,
        priority: formData.priority,
        tags: formData.tags,
        followUpRequired: formData.followUpRequired,
        followUpDate: formData.followUpDate || undefined,
        followUpNotes: formData.followUpNotes || undefined,
        status: formData.status
      });
      
      if (response.success) {
        await loadNotes();
        await loadStats();
        resetForm();
        setIsCreating(false);
      }
    } catch (error) {
      console.error('Error creating note:', error);
      setError('Failed to create note');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateNote = async () => {
    if (!editingNote) return;

    try {
      setLoading(true);
      const response = await apiService.updateNote(editingNote._id, {
        title: formData.title,
        content: formData.content,
        type: formData.type,
        priority: formData.priority,
        tags: formData.tags,
        followUpRequired: formData.followUpRequired,
        followUpDate: formData.followUpDate || undefined,
        followUpNotes: formData.followUpNotes || undefined,
        status: formData.status
      });
      
      if (response.success) {
        await loadNotes();
        await loadStats();
        setEditingNote(null);
        resetForm();
      }
    } catch (error) {
      console.error('Error updating note:', error);
      setError('Failed to update note');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm('Are you sure you want to delete this note?')) return;

    try {
      setLoading(true);
      await apiService.deleteNote(noteId);
      await loadNotes();
      await loadStats();
    } catch (error) {
      console.error('Error deleting note:', error);
      setError('Failed to delete note');
    } finally {
      setLoading(false);
    }
  };

  const handleEditNote = (note: Note) => {
    setEditingNote(note);
    setFormData({
      title: note.title,
      content: note.content,
      patientId: note.patient._id,
      sessionId: note.session?._id || "",
      type: note.type,
      priority: note.priority,
      tags: note.tags,
      followUpRequired: note.followUpRequired,
      followUpDate: note.followUpDate || "",
      followUpNotes: note.followUpNotes || "",
      status: note.status
    });
  };

  const resetForm = () => {
    setFormData({
      title: "",
      content: "",
      patientId: "",
      sessionId: "",
      type: "general",
      priority: "medium",
      tags: [],
      followUpRequired: false,
      followUpDate: "",
      followUpNotes: "",
      status: "draft"
    });
    setTagInput("");
    setPatientSearch("");
    setSelectedPatient(null);
    setShowPatientDropdown(false);
  };

  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData({
        ...formData,
        tags: [...formData.tags, tagInput.trim()]
      });
      setTagInput("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter(tag => tag !== tagToRemove)
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTypeIcon = (type: string) => {
    const noteType = NOTE_TYPES.find(t => t.value === type);
    const IconComponent = noteType?.icon || FileText;
    return <IconComponent className="h-4 w-4" />;
  };

  const getPatientName = (patient: Note['patient']) => {
    if (patient.profile?.firstName && patient.profile?.lastName) {
      return `${patient.profile.firstName} ${patient.profile.lastName}`;
    }
    return patient.username;
  };

  if (!isAuthenticated || user?.role !== 'counselor') {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          <Alert className="max-w-md">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              You need to be logged in as a counselor to access this page.
            </AlertDescription>
          </Alert>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Notes & Records</h1>
            <p className="text-gray-600 mt-1">Manage patient notes and clinical records</p>
          </div>
          <Button onClick={() => setIsCreating(true)} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            New Note
          </Button>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        )}

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-sm text-gray-600">Total Notes</p>
                    <p className="text-2xl font-bold">{stats.summary.totalNotes}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Edit className="h-5 w-5 text-orange-600" />
                  <div>
                    <p className="text-sm text-gray-600">Drafts</p>
                    <p className="text-2xl font-bold">{stats.summary.draftNotes}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-sm text-gray-600">Finalized</p>
                    <p className="text-2xl font-bold">{stats.summary.finalizedNotes}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  <div>
                    <p className="text-sm text-gray-600">Urgent</p>
                    <p className="text-2xl font-bold">{stats.summary.urgentNotes}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-purple-600" />
                  <div>
                    <p className="text-sm text-gray-600">Follow-ups</p>
                    <p className="text-2xl font-bold">{stats.summary.followUpRequired}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Search and Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search notes by title, content, tags, or patient..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Button 
                variant="outline" 
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2"
              >
                <Filter className="h-4 w-4" />
                Filters
              </Button>
            </div>

            {showFilters && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t">
                <div>
                  <Label>Note Type</Label>
                  <Select value={selectedType} onValueChange={setSelectedType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      {NOTE_TYPES.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Priority</Label>
                  <Select value={selectedPriority} onValueChange={setSelectedPriority}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Priorities</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="finalized">Finalized</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Notes List */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {loading ? (
            Array.from({ length: 6 }).map((_, index) => (
              <Card key={index} className="animate-pulse">
                <CardContent className="p-4">
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded mb-4"></div>
                  <div className="h-16 bg-gray-200 rounded mb-4"></div>
                  <div className="flex gap-2">
                    <div className="h-6 bg-gray-200 rounded px-3"></div>
                    <div className="h-6 bg-gray-200 rounded px-3"></div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : filteredNotes.length > 0 ? (
            filteredNotes.map((note) => (
              <Card key={note._id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg flex items-center gap-2">
                        {getTypeIcon(note.type)}
                        {note.title}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        Patient: {getPatientName(note.patient)}
                      </CardDescription>
                    </div>
                    <div className="flex gap-1">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleEditNote(note)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleDeleteNote(note._id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-4 line-clamp-3">
                    {note.content}
                  </p>
                  
                  <div className="flex flex-wrap gap-2 mb-4">
                    <Badge className={`text-xs ${PRIORITY_COLORS[note.priority]}`}>
                      {note.priority}
                    </Badge>
                    <Badge className={`text-xs ${STATUS_COLORS[note.status]}`}>
                      {note.status}
                    </Badge>
                    {note.followUpRequired && (
                      <Badge className="text-xs bg-purple-100 text-purple-800 border-purple-200">
                        Follow-up
                      </Badge>
                    )}
                  </div>

                  {note.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-4">
                      {note.tags.slice(0, 3).map((tag, index) => (
                        <span 
                          key={index}
                          className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                      {note.tags.length > 3 && (
                        <span className="text-xs text-gray-500">
                          +{note.tags.length - 3} more
                        </span>
                      )}
                    </div>
                  )}

                  <div className="text-xs text-gray-500 flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatDate(note.createdAt)}
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="col-span-full">
              <Card>
                <CardContent className="p-8 text-center">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">No notes found</p>
                  <Button onClick={() => setIsCreating(true)}>
                    Create your first note
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center mt-8">
            <div className="flex gap-2">
              <Button 
                variant="outline"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(currentPage - 1)}
              >
                Previous
              </Button>
              <span className="flex items-center px-4">
                Page {currentPage} of {totalPages}
              </span>
              <Button 
                variant="outline"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(currentPage + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Create/Edit Note Dialog */}
      <Dialog open={isCreating || !!editingNote} onOpenChange={(open) => {
        if (!open) {
          setIsCreating(false);
          setEditingNote(null);
          resetForm();
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingNote ? 'Edit Note' : 'Create New Note'}
            </DialogTitle>
            <DialogDescription>
              {editingNote ? 'Update the note details below.' : 'Fill in the details to create a new patient note.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                placeholder="Note title..."
                maxLength={200}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="relative">
                <Label htmlFor="patientSearch">Patient ID/Username *</Label>
                <Input
                  id="patientSearch"
                  value={patientSearch}
                  onChange={(e) => {
                    const value = e.target.value;
                    setPatientSearch(value);
                    // Also set patientId directly for form validation
                    setFormData({...formData, patientId: value});
                    if (value.length === 0) {
                      setSelectedPatient(null);
                    }
                  }}
                  placeholder="Enter patient ID/username (try 'test-patient-id')"
                />
                {(showPatientDropdown && patients.length > 0) && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                    {patients.map((patient) => (
                      <div
                        key={patient._id}
                        className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                        onClick={() => handleSelectPatient(patient)}
                      >
                        <div className="font-medium">{patient.displayName}</div>
                        <div className="text-sm text-gray-500">@{patient.username}</div>
                      </div>
                    ))}
                  </div>
                )}
                {patientSearch.length >= 2 && patients.length === 0 && !showPatientDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
                    <div
                      className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-blue-600"
                      onClick={() => handleSelectPatient({
                        _id: "test-patient-id",
                        username: "testpatient",
                        displayName: "Test Patient (Development)"
                      })}
                    >
                      <div className="font-medium">Test Patient (Development)</div>
                      <div className="text-sm text-gray-500">Use this for testing notes</div>
                    </div>
                  </div>
                )}
                {selectedPatient && (
                  <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-sm">
                    Selected: <strong>{selectedPatient.displayName}</strong> (@{selectedPatient.username})
                  </div>
                )}
                <div className="text-xs text-gray-500 mt-1">
                  💡 For testing: use "test-patient-id" or "patient123"
                </div>
              </div>
              <div>
                <Label htmlFor="sessionId">Session ID (Optional)</Label>
                <Input
                  id="sessionId"
                  value={formData.sessionId}
                  onChange={(e) => setFormData({...formData, sessionId: e.target.value})}
                  placeholder="Associated session ID..."
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Note Type</Label>
                <Select value={formData.type} onValueChange={(value) => setFormData({...formData, type: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {NOTE_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Priority</Label>
                <Select value={formData.priority} onValueChange={(value: any) => setFormData({...formData, priority: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="content">Content *</Label>
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e) => setFormData({...formData, content: e.target.value})}
                placeholder="Note content..."
                rows={6}
                maxLength={5000}
              />
              <p className="text-xs text-gray-500 mt-1">
                {formData.content.length}/5000 characters
              </p>
            </div>

            <div>
              <Label>Tags</Label>
              <div className="flex gap-2 mb-2">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  placeholder="Add a tag..."
                  maxLength={50}
                />
                <Button type="button" variant="outline" onClick={addTag}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.tags.map((tag, index) => (
                    <Badge key={index} variant="secondary" className="flex items-center gap-1">
                      {tag}
                      <button 
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="ml-1 hover:text-red-600"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="followUpRequired"
                checked={formData.followUpRequired}
                onCheckedChange={(checked) => setFormData({...formData, followUpRequired: !!checked})}
              />
              <Label htmlFor="followUpRequired">Follow-up required</Label>
            </div>

            {formData.followUpRequired && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="followUpDate">Follow-up Date</Label>
                  <Input
                    id="followUpDate"
                    type="datetime-local"
                    value={formData.followUpDate}
                    onChange={(e) => setFormData({...formData, followUpDate: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="followUpNotes">Follow-up Notes</Label>
                  <Textarea
                    id="followUpNotes"
                    value={formData.followUpNotes}
                    onChange={(e) => setFormData({...formData, followUpNotes: e.target.value})}
                    placeholder="Follow-up details..."
                    rows={2}
                    maxLength={1000}
                  />
                </div>
              </div>
            )}

            <div>
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={(value: any) => setFormData({...formData, status: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="finalized">Finalized</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button 
              onClick={editingNote ? handleUpdateNote : handleCreateNote}
              disabled={!formData.title?.trim() || !formData.content?.trim() || !formData.patientId || loading}
              className="flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              {editingNote ? 'Update Note' : 'Create Note'}
              {/* Debug info */}
              {process.env.NODE_ENV === 'development' && (
                <span className="text-xs ml-2">
                  (T:{!!formData.title?.trim()} C:{!!formData.content?.trim()} P:{!!formData.patientId} L:{loading})
                </span>
              )}
            </Button>
            <Button 
              variant="outline" 
              onClick={() => {
                setIsCreating(false);
                setEditingNote(null);
                resetForm();
              }}
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}