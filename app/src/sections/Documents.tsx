/**
 * HarborMesh - Documents Section
 * Document vault for manuals, certificates, and identity documents
 */

import { useState, useRef } from 'react';
import {
  FileText,
  Upload,
  Search,
  MoreHorizontal,
  Download,
  Eye,
  Trash2,
  Shield,
  CheckCircle2,
  Image,
  File,
  FileSpreadsheet,
  User,
  CreditCard,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DataSourceNotice } from '@/components/DataSourceNotice';
import { cn, formatDate, formatFileSize } from '@/lib/utils';
import { storeFile, retrieveFile, deleteFile as deleteStoredFile } from '@/lib/document-storage';
import { useAppStore, useDocumentStore, useSettingsStore, useVesselStore } from '@/store';
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
      authority: 'Transport Canada',
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
      authority: 'Marine Insurance Provider',
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
    title: 'Crew Passport',
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
  const { documents, selectedDocument, addDocument, deleteDocument, selectDocument } = useDocumentStore();
  const currentVessel = useVesselStore((state) => state.currentVessel);
  const setActiveView = useAppStore((state) => state.setActiveView);
  const demoModeEnabled = useSettingsStore((state) => state.demoModeEnabled);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterSensitivity, setFilterSensitivity] = useState<string>('all');
  const [showUpload, setShowUpload] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState('all');
  const [vesselFilter, setVesselFilter] = useState<'all' | 'current'>('all');
  const [uploadDraft, setUploadDraft] = useState<{
    type: DocumentType;
    title: string;
    sensitivity: Document['sensitivity']['level'];
    neverForTraining: boolean;
    file: File | null;
  }>({
    type: DocumentType.MANUAL,
    title: '',
    sensitivity: 'internal',
    neverForTraining: true,
    file: null,
  });
  
  const usingDemoDocuments = documents.length === 0 && demoModeEnabled;
  const currentDocuments = usingDemoDocuments ? demoDocuments : documents;

  const handleSaveDocument = async () => {
    if (!currentVessel) return;

    const now = new Date().toISOString();
    const documentId = crypto.randomUUID();
    const title = uploadDraft.title.trim() || 'Untitled Document';
    const file = uploadDraft.file;
    const fileName = file?.name ?? `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'document'}.metadata.json`;
    const fileSize = file?.size ?? 0;
    const mimeType = file?.type || 'application/json';

    if (file) {
      await storeFile(documentId, file);
    }

    const document: Document = {
      id: documentId,
      vesselId: currentVessel.id,
      type: uploadDraft.type,
      title,
      description: file ? `Stored locally (${formatFileSize(fileSize)})` : 'Metadata record only',
      storagePath: file ? `idb://${documentId}` : `local-metadata://${documentId}`,
      fileName,
      fileSize,
      mimeType,
      hash: `local:${documentId}`,
      metadata: {},
      sensitivity: {
        level: uploadDraft.sensitivity,
        neverForTraining: uploadDraft.neverForTraining,
        encryptionRequired: uploadDraft.sensitivity === 'confidential' || uploadDraft.sensitivity === 'restricted',
        allowedRoles: [UserRole.OWNER, UserRole.CAPTAIN, UserRole.ADMIN],
      },
      createdAt: now,
      updatedAt: now,
    };

    addDocument(document);
    setShowUpload(false);
    setUploadDraft({
      type: DocumentType.MANUAL,
      title: '',
      sensitivity: 'internal',
      neverForTraining: true,
      file: null,
    });
  };

  const handleDownloadDocument = async (doc: Document) => {
    if (!doc.storagePath.startsWith('idb://')) return;
    const stored = await retrieveFile(doc.id);
    if (!stored) return;
    const url = URL.createObjectURL(stored.blob);
    const a = Object.assign(document.createElement('a'), { href: url, download: stored.name });
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDeleteDocument = async (docId: string) => {
    await deleteStoredFile(docId);
    deleteDocument(docId);
  };
  
  // Filter documents
  const filteredDocuments = currentDocuments.filter((doc) => {
    const matchesSearch = doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         doc.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || doc.type === filterType;
    const matchesSensitivity = filterSensitivity === 'all' || doc.sensitivity.level === filterSensitivity;
    const matchesVessel = vesselFilter === 'all' || (currentVessel && doc.vesselId === currentVessel.id);

    // Tab filtering
    const matchesTab = activeTab === 'all' ||
                      (activeTab === 'vessel' && !doc.subjectId) ||
                      (activeTab === 'personal' && doc.subjectId) ||
                      (activeTab === 'expiring' && doc.metadata.expiryDate &&
                       new Date(doc.metadata.expiryDate) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));

    return matchesSearch && matchesType && matchesSensitivity && matchesTab && matchesVessel;
  });
  
  // Get expiring documents
  const expiringDocs = currentDocuments.filter((doc) => {
    if (!doc.metadata.expiryDate) return false;
    if (vesselFilter === 'current' && currentVessel && doc.vesselId !== currentVessel.id) return false;
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
    <div className="flex h-[calc(100dvh-3.5rem-4rem)] lg:h-[calc(100dvh-3.5rem)] flex-col gap-2">
      {/* Compact toolbar */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold tracking-tight flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" /> Documents
          </h1>
          <div className="hidden sm:flex items-center gap-3 text-xs text-muted-foreground">
            <span>{currentDocuments.length} docs</span>
            <span>{formatFileSize(currentDocuments.reduce((acc, d) => acc + d.fileSize, 0))}</span>
            {expiringDocs.length > 0 && <span className="text-amber-500 font-medium">{expiringDocs.length} expiring</span>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-56">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-8 h-8 text-sm" />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="h-8 w-[120px] text-xs"><SelectValue placeholder="All types" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {Object.entries(DocumentType).map(([key, value]) => (
                <SelectItem key={key} value={value}>{documentTypeNames[value]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterSensitivity} onValueChange={setFilterSensitivity}>
            <SelectTrigger className="h-8 w-[110px] text-xs"><SelectValue placeholder="All levels" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All levels</SelectItem>
              <SelectItem value="public">Public</SelectItem>
              <SelectItem value="internal">Internal</SelectItem>
              <SelectItem value="confidential">Confidential</SelectItem>
              <SelectItem value="restricted">Restricted</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" className="h-8" onClick={() => setShowUpload(true)} disabled={!currentVessel}>
            <Upload className="h-3.5 w-3.5 mr-1.5" /> Upload
          </Button>
        </div>
      </div>

      {usingDemoDocuments && (
        <DataSourceNotice title="Demo documents">Sample metadata — not stored user documents.</DataSourceNotice>
      )}

      {!currentVessel && !demoModeEnabled ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <FileText className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
            <h2 className="text-lg font-semibold">Create a vessel first</h2>
            <p className="mt-1 text-sm text-muted-foreground">Document metadata is saved against the active vessel.</p>
            <Button className="mt-4" onClick={() => setActiveView('vessel')}>Go to Vessel</Button>
          </div>
        </div>
      ) : (
        <>
      
      {/* Tab bar */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="h-8">
          <TabsTrigger value="all" className="text-xs h-7">All</TabsTrigger>
          <TabsTrigger value="vessel" className="text-xs h-7">Vessel</TabsTrigger>
          <TabsTrigger value="personal" className="text-xs h-7">Personal</TabsTrigger>
          <TabsTrigger value="expiring" className="text-xs h-7">
            Expiring {expiringDocs.length > 0 && <Badge variant="destructive" className="ml-1.5 text-[10px] px-1 h-4">{expiringDocs.length}</Badge>}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Full-viewport table */}
      <div className="flex-1 overflow-auto rounded-lg border bg-card">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm border-b">
            <tr>
              <th className="px-3 py-2 text-left font-medium w-10">Type</th>
              <th className="px-3 py-2 text-left font-medium">Title</th>
              <th className="px-3 py-2 text-left font-medium hidden md:table-cell">Sensitivity</th>
              <th className="px-3 py-2 text-right font-medium hidden md:table-cell">Size</th>
              <th className="px-3 py-2 text-left font-medium hidden lg:table-cell">Expiry</th>
              <th className="px-3 py-2 text-left font-medium hidden xl:table-cell">Authority</th>
              <th className="px-3 py-2 w-12" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredDocuments.length === 0 ? (
              <tr><td colSpan={7} className="py-16 text-center text-muted-foreground">
                <FileText className="h-10 w-10 mx-auto mb-2 opacity-30" />
                No documents found
              </td></tr>
            ) : filteredDocuments.map((doc) => {
              const Icon = getDocumentIcon(doc.type);
              const isExpiring = doc.metadata.expiryDate && new Date(doc.metadata.expiryDate) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
              return (
                <tr key={doc.id} className={cn('hover:bg-muted/50 transition-colors cursor-pointer', selectedDocument?.id === doc.id && 'bg-muted')} onClick={() => selectDocument(doc)}>
                  <td className="px-3 py-2.5">
                    <div className={cn('inline-flex p-1.5 rounded', doc.subjectId ? 'bg-purple-50 text-purple-500 dark:bg-purple-950/30' : 'bg-blue-50 text-blue-500 dark:bg-blue-950/30')}>
                      <Icon className="h-4 w-4" />
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="font-medium flex items-center gap-2">
                      {doc.title}
                      {doc.subjectId && <Badge variant="outline" className="text-[10px] px-1"><User className="h-2.5 w-2.5 mr-0.5" />Personal</Badge>}
                      {isExpiring && <Badge variant="destructive" className="text-[10px] px-1">Expiring</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground truncate max-w-[250px]">{doc.description}</p>
                  </td>
                  <td className="px-3 py-2.5 hidden md:table-cell">{getSensitivityBadge(doc.sensitivity.level)}</td>
                  <td className="px-3 py-2.5 text-right text-muted-foreground text-xs hidden md:table-cell">{formatFileSize(doc.fileSize)}</td>
                  <td className="px-3 py-2.5 text-xs hidden lg:table-cell">
                    {doc.metadata.expiryDate ? (
                      <span className={isExpiring ? 'text-red-500' : 'text-muted-foreground'}>{formatDate(doc.metadata.expiryDate)}</span>
                    ) : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground hidden xl:table-cell">{doc.metadata.authority || '—'}</td>
                  <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="h-3.5 w-3.5" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleDownloadDocument(doc)}><Eye className="h-4 w-4 mr-2" />View</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDownloadDocument(doc)} disabled={!doc.storagePath.startsWith('idb://')}>
                          <Download className="h-4 w-4 mr-2" />Download
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-red-500" disabled={usingDemoDocuments} onClick={() => handleDeleteDocument(doc.id)}>
                          <Trash2 className="h-4 w-4 mr-2" />Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      </>)
      }
      
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
              <Input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setUploadDraft((draft) => ({ ...draft, title: draft.title || file.name, file }));
                  }
                }}
              />
              <Button variant="outline" size="sm" className="mt-3" onClick={() => fileInputRef.current?.click()}>
                Browse Files
              </Button>
            </div>
            
            <div className="space-y-2">
              <Label>Document Type</Label>
              <Select
                value={uploadDraft.type}
                onValueChange={(value) => setUploadDraft((draft) => ({ ...draft, type: value as DocumentType }))}
              >
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
              <Input
                placeholder="Document title"
                value={uploadDraft.title}
                onChange={(event) => setUploadDraft((draft) => ({ ...draft, title: event.target.value }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Sensitivity Level</Label>
              <Select
                value={uploadDraft.sensitivity}
                onValueChange={(value) => setUploadDraft((draft) => ({
                  ...draft,
                  sensitivity: value as Document['sensitivity']['level'],
                }))}
              >
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
              <input
                type="checkbox"
                id="no-ai"
                className="rounded"
                checked={uploadDraft.neverForTraining}
                onChange={(event) => setUploadDraft((draft) => ({
                  ...draft,
                  neverForTraining: event.target.checked,
                }))}
              />
              <Label htmlFor="no-ai" className="text-sm">
                Never use for AI training
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUpload(false)}>Cancel</Button>
            <Button onClick={handleSaveDocument} disabled={!currentVessel}>
              {uploadDraft.file ? 'Upload & Save' : 'Save Metadata'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
