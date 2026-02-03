/**
 * HarborMesh - Documents Section
 * Document vault for manuals, certificates, and identity documents
 */

import React, { useState } from 'react';
import {
  FileText,
  Upload,
  Search,
  Filter,
  MoreHorizontal,
  Download,
  Eye,
  Trash2,
  Shield,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Folder,
  Image,
  File,
  FileSpreadsheet,
  Calendar,
  Lock,
  Unlock,
  User,
  Flag,
  CreditCard,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn, formatDate, formatFileSize, truncate } from '@/lib/utils';
import { useDocumentStore } from '@/store';
import { DocumentType, UserRole, type Document } from '@/types';

// Document type display names
const documentTypeNames: Record<string, string> = {
  [DocumentType.MANUAL]: 'Manual',
  [DocumentType.SURVEY]: 'Survey',
  [DocumentType.REGISTRATION]: 'Registration',
  [DocumentType.INSURANCE]: 'Insurance',
  [DocumentType.COMPLIANCE_CERTIFICATE]: 'Certificate',
  [DocumentType.PASSPORT]: 'Passport',
  [DocumentType.VISA]: 'Visa',
  [DocumentType.LICENSE]: 'License',
  [DocumentType.MEDICAL_CERTIFICATE]: 'Medical',
  [DocumentType.CREW_AGREEMENT]: 'Crew Agreement',
  [DocumentType.CHARTER_AGREEMENT]: 'Charter',
  [DocumentType.BILL_OF_SALE]: 'Bill of Sale',
  [DocumentType.WARRANTY]: 'Warranty',
  [DocumentType.INVOICE]: 'Invoice',
  [DocumentType.MAINTENANCE_RECORD]: 'Maintenance',
  [DocumentType.PHOTO]: 'Photo',
  [DocumentType.VIDEO]: 'Video',
  [DocumentType.OTHER]: 'Other',
};

// Document type icons
const documentTypeIcons: Record<string, React.ElementType> = {
  [DocumentType.MANUAL]: FileText,
  [DocumentType.SURVEY]: FileSpreadsheet,
  [DocumentType.REGISTRATION]: FileText,
  [DocumentType.INSURANCE]: Shield,
  [DocumentType.COMPLIANCE_CERTIFICATE]: CheckCircle2,
  [DocumentType.PASSPORT]: CreditCard,
  [DocumentType.VISA]: CreditCard,
  [DocumentType.LICENSE]: CreditCard,
  [DocumentType.MEDICAL_CERTIFICATE]: CheckCircle2,
  [DocumentType.CREW_AGREEMENT]: FileText,
  [DocumentType.CHARTER_AGREEMENT]: FileText,
  [DocumentType.BILL_OF_SALE]: FileText,
  [DocumentType.WARRANTY]: Shield,
  [DocumentType.INVOICE]: FileSpreadsheet,
  [DocumentType.MAINTENANCE_RECORD]: FileText,
  [DocumentType.PHOTO]: Image,
  [DocumentType.VIDEO]: File,
  [DocumentType.OTHER]: File,
};

// Demo documents
const demoDocuments: Document[] = [
  {
    id: 'doc-001',
    vesselId: 'demo-vessel',
    type: DocumentType.REGISTRATION,
    title: 'Vessel Registration',
    description: 'Official USCG vessel registration',
    storagePath: '/documents/registration.pdf',
    fileName: 'registration.pdf',
    fileSize: 245760,
    mimeType: 'application/pdf',
    hash: 'abc123',
    metadata: {
      issueDate: '2023-01-15',
      expiryDate: '2026-01-15',
      documentNumber: 'CF-1234-AB',
      authority: 'US Coast Guard',
    },
    sensitivity: {
      level: 'internal',
      neverForTraining: true,
      encryptionRequired: true,
      allowedRoles: [UserRole.OWNER, UserRole.CAPTAIN, UserRole.ADMIN],
    },
    createdAt: '2023-01-15',
    updatedAt: '2023-01-15',
  },
  {
    id: 'doc-002',
    vesselId: 'demo-vessel',
    type: DocumentType.INSURANCE,
    title: 'Insurance Policy 2024',
    description: 'Full coverage marine insurance',
    storagePath: '/documents/insurance.pdf',
    fileName: 'insurance_2024.pdf',
    fileSize: 524288,
    mimeType: 'application/pdf',
    hash: 'def456',
    metadata: {
      issueDate: '2024-01-01',
      expiryDate: '2025-01-01',
      documentNumber: 'POL-987654321',
      authority: 'BoatUS Insurance',
    },
    sensitivity: {
      level: 'confidential',
      neverForTraining: true,
      encryptionRequired: true,
      allowedRoles: [UserRole.OWNER, UserRole.ADMIN],
    },
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
  },
  {
    id: 'doc-003',
    vesselId: 'demo-vessel',
    type: DocumentType.SURVEY,
    title: 'Pre-Purchase Survey 2023',
    description: 'Complete vessel condition survey',
    storagePath: '/documents/survey.pdf',
    fileName: 'survey_2023.pdf',
    fileSize: 3145728,
    mimeType: 'application/pdf',
    hash: 'ghi789',
    metadata: {
      issueDate: '2023-02-10',
      documentNumber: 'SUR-2023-001',
      authority: 'Marine Surveyors Inc.',
    },
    sensitivity: {
      level: 'internal',
      neverForTraining: false,
      encryptionRequired: false,
      allowedRoles: [UserRole.OWNER, UserRole.CAPTAIN, UserRole.ADMIN],
    },
    createdAt: '2023-02-10',
    updatedAt: '2023-02-10',
  },
  {
    id: 'doc-004',
    vesselId: 'demo-vessel',
    type: DocumentType.MANUAL,
    title: 'Yanmar 3YM30 Manual',
    description: 'Engine operation and maintenance manual',
    storagePath: '/documents/engine_manual.pdf',
    fileName: 'yanmar_3ym30_manual.pdf',
    fileSize: 8388608,
    mimeType: 'application/pdf',
    hash: 'jkl012',
    metadata: {
      documentNumber: 'DOC-12345',
    },
    sensitivity: {
      level: 'public',
      neverForTraining: false,
      encryptionRequired: false,
      allowedRoles: [UserRole.OWNER, UserRole.CAPTAIN, UserRole.ENGINEER, UserRole.CREW, UserRole.ADMIN],
    },
    createdAt: '2023-01-01',
    updatedAt: '2023-01-01',
  },
  {
    id: 'doc-005',
    vesselId: 'demo-vessel',
    subjectId: 'user-001',
    type: DocumentType.PASSPORT,
    title: 'Captain Passport',
    description: 'Personal passport document',
    storagePath: '/documents/passport.pdf',
    fileName: 'passport_redacted.pdf',
    fileSize: 1048576,
    mimeType: 'application/pdf',
    hash: 'mno345',
    metadata: {
      issueDate: '2020-05-15',
      expiryDate: '2030-05-15',
      documentNumber: 'P***1234',
      country: 'US',
    },
    sensitivity: {
      level: 'restricted',
      neverForTraining: true,
      encryptionRequired: true,
      allowedRoles: [UserRole.OWNER, UserRole.ADMIN],
    },
    createdAt: '2023-01-01',
    updatedAt: '2023-01-01',
  },
  {
    id: 'doc-006',
    vesselId: 'demo-vessel',
    type: DocumentType.COMPLIANCE_CERTIFICATE,
    title: 'Safety Equipment Certificate',
    description: 'Current safety equipment compliance',
    storagePath: '/documents/safety_cert.pdf',
    fileName: 'safety_certificate.pdf',
    fileSize: 512000,
    mimeType: 'application/pdf',
    hash: 'pqr678',
    metadata: {
      issueDate: '2024-01-10',
      expiryDate: '2025-01-10',
      documentNumber: 'SEC-2024-001',
      authority: 'USCG Auxiliary',
    },
    sensitivity: {
      level: 'internal',
      neverForTraining: false,
      encryptionRequired: false,
      allowedRoles: [UserRole.OWNER, UserRole.CAPTAIN, UserRole.ADMIN],
    },
    createdAt: '2024-01-10',
    updatedAt: '2024-01-10',
  },
];

export function Documents() {
  const { documents, setDocuments, selectedDocument, selectDocument } = useDocumentStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterSensitivity, setFilterSensitivity] = useState<string>('all');
  const [showUpload, setShowUpload] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  
  // Initialize with demo data
  React.useEffect(() => {
    if (documents.length === 0) {
      setDocuments(demoDocuments);
    }
  }, [documents.length, setDocuments]);
  
  const currentDocuments = documents.length > 0 ? documents : demoDocuments;
  
  // Filter documents
  const filteredDocuments = currentDocuments.filter((doc) => {
    const matchesSearch = doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         doc.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || doc.type === filterType;
    const matchesSensitivity = filterSensitivity === 'all' || doc.sensitivity.level === filterSensitivity;
    
    // Tab filtering
    const matchesTab = activeTab === 'all' ||
                      (activeTab === 'vessel' && !doc.subjectId) ||
                      (activeTab === 'personal' && doc.subjectId) ||
                      (activeTab === 'expiring' && doc.metadata.expiryDate && 
                       new Date(doc.metadata.expiryDate) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));
    
    return matchesSearch && matchesType && matchesSensitivity && matchesTab;
  });
  
  // Get expiring documents
  const expiringDocs = currentDocuments.filter((doc) => {
    if (!doc.metadata.expiryDate) return false;
    const daysUntilExpiry = Math.ceil((new Date(doc.metadata.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= 30 && daysUntilExpiry > 0;
  });
  
  // Get document icon
  const getDocumentIcon = (type: string) => {
    const Icon = documentTypeIcons[type] || File;
    return Icon;
  };
  
  // Get sensitivity badge
  const getSensitivityBadge = (level: string) => {
    const configs = {
      public: { variant: 'outline', className: 'text-emerald-500 border-emerald-200' },
      internal: { variant: 'outline', className: 'text-blue-500 border-blue-200' },
      confidential: { variant: 'outline', className: 'text-amber-500 border-amber-200' },
      restricted: { variant: 'outline', className: 'text-red-500 border-red-200' },
    };
    const config = configs[level as keyof typeof configs] || configs.internal;
    return (
      <Badge variant={config.variant as never} className={config.className}>
        {level}
      </Badge>
    );
  };
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Documents & Identity</h1>
          <p className="text-muted-foreground mt-1">
            Secure vault for manuals, certificates, and personal documents
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Folder className="h-4 w-4 mr-2" />
            Organize
          </Button>
          <Button size="sm" onClick={() => setShowUpload(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Upload
          </Button>
        </div>
      </div>
      
      {/* Expiring Documents Alert */}
      {expiringDocs.length > 0 && (
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
              <div>
                <h4 className="font-medium text-amber-800 dark:text-amber-200">
                  {expiringDocs.length} document(s) expiring soon
                </h4>
                <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                  Review and renew documents before they expire to maintain compliance.
                </p>
                <div className="flex gap-2 mt-2">
                  {expiringDocs.slice(0, 3).map((doc) => (
                    <Badge key={doc.id} variant="outline" className="text-amber-700 border-amber-300">
                      {truncate(doc.title, 20)}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Main Content */}
      <div className="grid lg:grid-cols-4 gap-6">
        {/* Left Sidebar - Filters */}
        <div className="space-y-4">
          {/* Search */}
          <Card>
            <CardContent className="pt-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search documents..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </CardContent>
          </Card>
          
          {/* Filters */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs">Document Type</Label>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger>
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {Object.entries(DocumentType).map(([key, value]) => (
                      <SelectItem key={key} value={value}>
                        {documentTypeNames[value]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label className="text-xs">Sensitivity</Label>
                <Select value={filterSensitivity} onValueChange={setFilterSensitivity}>
                  <SelectTrigger>
                    <SelectValue placeholder="All levels" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Levels</SelectItem>
                    <SelectItem value="public">Public</SelectItem>
                    <SelectItem value="internal">Internal</SelectItem>
                    <SelectItem value="confidential">Confidential</SelectItem>
                    <SelectItem value="restricted">Restricted</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
          
          {/* Stats */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Storage</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Documents</span>
                <span className="font-medium">{currentDocuments.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Size</span>
                <span className="font-medium">
                  {formatFileSize(currentDocuments.reduce((acc, d) => acc + d.fileSize, 0))}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Expiring Soon</span>
                <span className="font-medium text-amber-500">{expiringDocs.length}</span>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Main Content - Document List */}
        <div className="lg:col-span-3">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="all">All Documents</TabsTrigger>
              <TabsTrigger value="vessel">Vessel</TabsTrigger>
              <TabsTrigger value="personal">Personal</TabsTrigger>
              <TabsTrigger value="expiring">
                Expiring
                {expiringDocs.length > 0 && (
                  <Badge variant="destructive" className="ml-2 text-xs">{expiringDocs.length}</Badge>
                )}
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value={activeTab} className="mt-0">
              <Card>
                <CardContent className="p-0">
                  {filteredDocuments.length === 0 ? (
                    <div className="text-center py-12">
                      <FileText className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                      <p className="text-muted-foreground">No documents found</p>
                      <Button variant="outline" className="mt-3" onClick={() => setShowUpload(true)}>
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Document
                      </Button>
                    </div>
                  ) : (
                    <ScrollArea className="h-[600px]">
                      <div className="divide-y">
                        {filteredDocuments.map((doc) => {
                          const Icon = getDocumentIcon(doc.type);
                          const isExpiring = doc.metadata.expiryDate && 
                            new Date(doc.metadata.expiryDate) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
                          
                          return (
                            <div
                              key={doc.id}
                              className={cn(
                                'flex items-start gap-4 p-4 hover:bg-muted/50 cursor-pointer transition-colors',
                                selectedDocument?.id === doc.id && 'bg-muted'
                              )}
                              onClick={() => selectDocument(doc)}
                            >
                              <div className={cn(
                                'p-3 rounded-lg',
                                doc.subjectId ? 'bg-purple-50 text-purple-500 dark:bg-purple-950/30' : 'bg-blue-50 text-blue-500 dark:bg-blue-950/30'
                              )}>
                                <Icon className="h-6 w-6" />
                              </div>
                              
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between">
                                  <div>
                                    <h4 className="font-medium flex items-center gap-2">
                                      {doc.title}
                                      {doc.subjectId && (
                                        <Badge variant="outline" className="text-xs">
                                          <User className="h-3 w-3 mr-1" />
                                          Personal
                                        </Badge>
                                      )}
                                      {isExpiring && (
                                        <Badge variant="destructive" className="text-xs">
                                          <Clock className="h-3 w-3 mr-1" />
                                          Expiring
                                        </Badge>
                                      )}
                                    </h4>
                                    <p className="text-sm text-muted-foreground mt-0.5">
                                      {doc.description}
                                    </p>
                                  </div>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                      <Button variant="ghost" size="icon">
                                        <MoreHorizontal className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem>
                                        <Eye className="h-4 w-4 mr-2" />
                                        View
                                      </DropdownMenuItem>
                                      <DropdownMenuItem>
                                        <Download className="h-4 w-4 mr-2" />
                                        Download
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem className="text-red-500">
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Delete
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                                
                                <div className="flex flex-wrap items-center gap-3 mt-2">
                                  <Badge variant="outline" className="text-xs capitalize">
                                    {documentTypeNames[doc.type]}
                                  </Badge>
                                  {getSensitivityBadge(doc.sensitivity.level)}
                                  <span className="text-xs text-muted-foreground">
                                    {formatFileSize(doc.fileSize)}
                                  </span>
                                  {doc.metadata.expiryDate && (
                                    <span className={cn(
                                      'text-xs flex items-center gap-1',
                                      isExpiring ? 'text-red-500' : 'text-muted-foreground'
                                    )}>
                                      <Calendar className="h-3 w-3" />
                                      Expires {formatDate(doc.metadata.expiryDate)}
                                    </span>
                                  )}
                                  {doc.sensitivity.neverForTraining && (
                                    <span className="text-xs text-emerald-500 flex items-center gap-1">
                                      <Lock className="h-3 w-3" />
                                      Never for AI training
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
      
      {/* Upload Dialog */}
      <Dialog open={showUpload} onOpenChange={setShowUpload}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
            <DialogDescription>
              Upload a new document to your secure vault
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm font-medium">Drag and drop files here</p>
              <p className="text-xs text-muted-foreground mt-1">or click to browse</p>
              <Input type="file" className="hidden" />
              <Button variant="outline" size="sm" className="mt-3">
                Browse Files
              </Button>
            </div>
            
            <div className="space-y-2">
              <Label>Document Type</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(DocumentType).map(([key, value]) => (
                    <SelectItem key={key} value={value}>
                      {documentTypeNames[value]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Title</Label>
              <Input placeholder="Document title" />
            </div>
            
            <div className="space-y-2">
              <Label>Sensitivity Level</Label>
              <Select defaultValue="internal">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">Public - Anyone can view</SelectItem>
                  <SelectItem value="internal">Internal - Crew only</SelectItem>
                  <SelectItem value="confidential">Confidential - Captain & Owner</SelectItem>
                  <SelectItem value="restricted">Restricted - Owner only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center gap-2">
              <input type="checkbox" id="no-ai" className="rounded" />
              <Label htmlFor="no-ai" className="text-sm">
                Never use for AI training
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUpload(false)}>Cancel</Button>
            <Button onClick={() => setShowUpload(false)}>Upload</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
