/**
 * HarborMesh - Settings Section
 * Application preferences, AI configuration, and consent management
 */

import React, { useRef, useState } from 'react';
import {
  User,
  Shield,
  Database,
  Wifi,
  Moon,
  Sun,
  Globe,
  Ruler,
  Cloud,
  Bot,
  CheckCircle2,
  RefreshCw,
  Download,
  Upload,
  Trash2,
  Info,
  KeyRound,
  LogOut,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { buildSignalKStreamUrl } from '@/lib/signalk';
import { buildBoatNodeRegistrationPayload, registerBoatNode } from '@/lib/device-registration';
import {
  buildLocalDataExport,
  importLocalDataExport,
  parseLocalDataExport,
  serializeLocalDataExport,
} from '@/lib/local-data-portability';
import {
  clearAccountSession,
  fetchCurrentAccount,
  getAccountSession,
  loginAccount,
  registerAccount,
  replaceAccountSessionAccount,
  type AccountSessionEnvelope,
} from '@/lib/account-session';
import {
  clearPilotApiCredentials,
  getPilotApiCredentials,
  requestPilotOperatorSession,
  savePilotApiCredentials,
  savePilotReviewSession,
} from '@/lib/pilot-api-credentials';
import { useSettingsStore, useAIStore, useAppStore, type TelemetryMode } from '@/store';
import { ThemeMode, UnitSystem, AIProviderType, SharePositionLevel } from '@/types';

export function Settings() {
  const { userPreferences, updateUserPreferences, consent, setConsent, boatNode, updateBoatNodeSettings } = useSettingsStore();
  const { providers, activeProvider, setActiveProvider, addProvider } = useAIStore();
  const { connectionStatus, addNotification } = useAppStore();
  const [showAddAI, setShowAddAI] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [registeringDevice, setRegisteringDevice] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);
  const savedPilotApiCredentials = getPilotApiCredentials();
  const [pilotApiKeyInput, setPilotApiKeyInput] = useState(savedPilotApiCredentials?.apiKey ?? '');
  const [pilotOperatorIdInput, setPilotOperatorIdInput] = useState(savedPilotApiCredentials?.operatorId ?? '');
  const [pilotCredentialsSavedAt, setPilotCredentialsSavedAt] = useState(savedPilotApiCredentials?.savedAt ?? null);
  const [pilotReviewSessionExpiresAt, setPilotReviewSessionExpiresAt] = useState(savedPilotApiCredentials?.reviewSessionExpiresAt ?? null);
  const [pilotReviewSessionLoading, setPilotReviewSessionLoading] = useState(false);
  const savedAccountSession = getAccountSession();
  const [accountSession, setAccountSession] = useState<AccountSessionEnvelope | null>(savedAccountSession);
  const [accountEmailInput, setAccountEmailInput] = useState(savedAccountSession?.session.account.email ?? '');
  const [accountDisplayNameInput, setAccountDisplayNameInput] = useState(savedAccountSession?.session.account.displayName ?? '');
  const [accountPasswordInput, setAccountPasswordInput] = useState('');
  const [accountInviteCodeInput, setAccountInviteCodeInput] = useState('');
  const [accountLoading, setAccountLoading] = useState(false);
  const [accountError, setAccountError] = useState<string | null>(null);
  const [newProvider, setNewProvider] = useState({
    name: '',
    providerType: AIProviderType.LOCAL,
    apiUrl: 'http://localhost:11434',
    apiKey: '',
  });
  
  // Initialize default consent if not set
  React.useEffect(() => {
    if (!consent) {
      setConsent({
        vesselId: 'demo-vessel',
        userId: 'demo-user',
        shareLivePosition: SharePositionLevel.NONE,
        shareTelemetryForCommunity: false,
        shareTelemetryForTraining: false,
        telemetryAnonymization: 'full',
        shareLogsForTraining: false,
        logAnonymization: 'full',
        enterpriseLockdownMode: false,
        fleetOnlySharing: false,
        allowAICloudProcessing: false,
        allowAITrainingUse: false,
        lastUpdated: new Date().toISOString(),
        updatedBy: 'demo-user',
      });
    }
  }, [consent, setConsent]);
  
  const handleAddProvider = () => {
    const provider = {
      id: crypto.randomUUID(),
      ...newProvider,
      capabilities: [
        { type: 'chat', supported: true },
        { type: 'embeddings', supported: true },
      ],
      defaultForChat: providers.length === 0,
      defaultForVision: false,
      defaultForEmbeddings: providers.length === 0,
      isActive: true,
    };
    addProvider(provider as never);
    setShowAddAI(false);
    setNewProvider({
      name: '',
      providerType: AIProviderType.LOCAL,
      apiUrl: 'http://localhost:11434',
      apiKey: '',
    });
  };

  const signalKStreamUrl = (() => {
    try {
      return buildSignalKStreamUrl(boatNode.signalKBaseUrl, boatNode.signalKSubscribe);
    } catch {
      return 'Invalid Boat Node URL';
    }
  })();

  const applyBoatNodeSettings = () => {
    addNotification({
      type: 'info',
      title: 'Boat Node Settings Saved',
      message: 'Navigation will reconnect with the current telemetry source.',
    });
  };

  const handleSavePilotApiCredentials = () => {
    const savedCredentials = savePilotApiCredentials({
      apiKey: pilotApiKeyInput,
      operatorId: pilotOperatorIdInput,
    });
    setPilotCredentialsSavedAt(savedCredentials?.savedAt ?? null);
    setPilotReviewSessionExpiresAt(savedCredentials?.reviewSessionExpiresAt ?? null);
    addNotification({
      type: savedCredentials ? 'success' : 'info',
      title: savedCredentials ? 'Pilot API Credentials Saved' : 'Pilot API Credentials Cleared',
      message: savedCredentials
        ? 'Community sync and moderation requests will use the saved local credentials.'
        : 'Community requests will fall back to environment configuration.',
    });
  };

  const handleClearPilotApiCredentials = () => {
    clearPilotApiCredentials();
    setPilotApiKeyInput('');
    setPilotOperatorIdInput('');
    setPilotCredentialsSavedAt(null);
    setPilotReviewSessionExpiresAt(null);
    addNotification({
      type: 'info',
      title: 'Pilot API Credentials Cleared',
      message: 'Community requests will fall back to environment configuration.',
    });
  };

  const handleCreatePilotReviewSession = async () => {
    setPilotReviewSessionLoading(true);

    try {
      const session = await requestPilotOperatorSession({
        apiKey: pilotApiKeyInput,
        operatorId: pilotOperatorIdInput,
      });
      const savedCredentials = savePilotReviewSession(session);
      setPilotOperatorIdInput(savedCredentials?.operatorId ?? session.operatorId);
      setPilotCredentialsSavedAt(savedCredentials?.savedAt ?? null);
      setPilotReviewSessionExpiresAt(savedCredentials?.reviewSessionExpiresAt ?? session.expiresAt);
      addNotification({
        type: 'success',
        title: 'Review Session Ready',
        message: `Review calls will use a short-lived session until ${new Date(session.expiresAt).toLocaleString()}.`,
      });
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Review Session Failed',
        message: error instanceof Error ? error.message : 'Could not create review session.',
      });
    } finally {
      setPilotReviewSessionLoading(false);
    }
  };

  const handleExportLocalData = () => {
    try {
      const bundle = buildLocalDataExport();
      const blob = new Blob([serializeLocalDataExport(bundle)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `harbourmesh-local-data-${bundle.exportedAt.slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
      addNotification({
        type: 'success',
        title: 'Local Data Exported',
        message: `${Object.keys(bundle.stores).length} local data stores exported. AI provider keys were excluded.`,
      });
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Local Data Export Failed',
        message: error instanceof Error ? error.message : 'Export failed.',
      });
    }
  };

  const handleImportLocalData = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    if (!file) return;

    try {
      const bundle = parseLocalDataExport(await file.text());
      const result = importLocalDataExport(bundle);
      addNotification({
        type: 'success',
        title: 'Local Data Imported',
        message: `${result.importedStores.length} local data stores imported. Refresh the app to load them.`,
      });
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Local Data Import Failed',
        message: error instanceof Error ? error.message : 'Import failed.',
      });
    } finally {
      event.currentTarget.value = '';
    }
  };

  const applyAccountSession = (sessionEnvelope: AccountSessionEnvelope) => {
    setAccountSession(sessionEnvelope);
    setAccountEmailInput(sessionEnvelope.session.account.email);
    setAccountDisplayNameInput(sessionEnvelope.session.account.displayName);
    setAccountPasswordInput('');
    setAccountInviteCodeInput('');
  };

  const handleRegisterAccount = async () => {
    setAccountLoading(true);
    setAccountError(null);

    try {
      const sessionEnvelope = await registerAccount({
        email: accountEmailInput,
        displayName: accountDisplayNameInput,
        password: accountPasswordInput,
        inviteCode: accountInviteCodeInput,
      });
      applyAccountSession(sessionEnvelope);
      addNotification({
        type: 'success',
        title: 'Account Registered',
        message: `${sessionEnvelope.session.account.displayName} is signed in.`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Account registration failed.';
      setAccountError(message);
      addNotification({
        type: 'error',
        title: 'Account Registration Failed',
        message,
      });
    } finally {
      setAccountLoading(false);
    }
  };

  const handleLoginAccount = async () => {
    setAccountLoading(true);
    setAccountError(null);

    try {
      const sessionEnvelope = await loginAccount({
        email: accountEmailInput,
        password: accountPasswordInput,
      });
      applyAccountSession(sessionEnvelope);
      addNotification({
        type: 'success',
        title: 'Account Signed In',
        message: `${sessionEnvelope.session.account.email} is active on this device.`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Account login failed.';
      setAccountError(message);
      addNotification({
        type: 'error',
        title: 'Account Sign-In Failed',
        message,
      });
    } finally {
      setAccountLoading(false);
    }
  };

  const handleRefreshAccount = async () => {
    setAccountLoading(true);
    setAccountError(null);

    try {
      const account = await fetchCurrentAccount();
      const sessionEnvelope = replaceAccountSessionAccount(account);
      if (sessionEnvelope) {
        applyAccountSession(sessionEnvelope);
      } else {
        setAccountSession(null);
      }
      addNotification({
        type: 'success',
        title: 'Account Refreshed',
        message: `${account.email} is current.`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not refresh account.';
      setAccountError(message);
      if (message === 'account_session_required' || message === 'invalid_account_session') {
        setAccountSession(null);
      }
      addNotification({
        type: 'error',
        title: 'Account Refresh Failed',
        message,
      });
    } finally {
      setAccountLoading(false);
    }
  };

  const handleSignOutAccount = () => {
    clearAccountSession();
    setAccountSession(null);
    setAccountPasswordInput('');
    setAccountError(null);
    addNotification({
      type: 'info',
      title: 'Account Signed Out',
      message: 'This browser no longer has an account session.',
    });
  };

  const handleRegisterBoatNode = async () => {
    setRegisteringDevice(true);

    try {
      const payload = buildBoatNodeRegistrationPayload(boatNode, consent);
      const receipt = await registerBoatNode(payload);
      updateBoatNodeSettings({
        deviceRegisteredAt: receipt.registeredAt,
      });
      addNotification({
        type: 'success',
        title: 'Boat Node Registered',
        message: `${receipt.deviceId} is registered for community data provenance.`,
      });
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Boat Node Registration Failed',
        message: error instanceof Error ? error.message : 'Registration failed.',
      });
    } finally {
      setRegisteringDevice(false);
    }
  };

  const pilotReviewSessionTimestamp = pilotReviewSessionExpiresAt ? Date.parse(pilotReviewSessionExpiresAt) : NaN;
  const pilotReviewSessionActive = Number.isFinite(pilotReviewSessionTimestamp) && pilotReviewSessionTimestamp > Date.now();
  const accountSessionExpiresAt = accountSession?.session.expiresAt ?? null;
  const accountSessionTimestamp = accountSessionExpiresAt ? Date.parse(accountSessionExpiresAt) : NaN;
  const accountSessionActive = Number.isFinite(accountSessionTimestamp) && accountSessionTimestamp > Date.now();
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground mt-1">
            Configure your HarborMesh experience
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExportLocalData}>
            <Download className="h-4 w-4 mr-2" />
            Export Data
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowResetConfirm(true)}>
            <Trash2 className="h-4 w-4 mr-2" />
            Reset
          </Button>
        </div>
      </div>
      
      {/* Settings Tabs */}
      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="account">Account</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
          <TabsTrigger value="ai">AI & Models</TabsTrigger>
          <TabsTrigger value="privacy">Privacy & Consent</TabsTrigger>
          <TabsTrigger value="network">Network</TabsTrigger>
          <TabsTrigger value="data">Data & Storage</TabsTrigger>
        </TabsList>
        
        {/* General Settings */}
        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                User Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Display Name</Label>
                  <Input placeholder="Your name" defaultValue="Captain" />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" placeholder="your@email.com" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input placeholder="+1 (555) 000-0000" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Regional Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Language</Label>
                  <Select 
                    value={userPreferences.language} 
                    onValueChange={(v) => updateUserPreferences({ language: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="es">Español</SelectItem>
                      <SelectItem value="fr">Français</SelectItem>
                      <SelectItem value="de">Deutsch</SelectItem>
                      <SelectItem value="it">Italiano</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Timezone</Label>
                  <Select 
                    value={userPreferences.timezone} 
                    onValueChange={(v) => updateUserPreferences({ timezone: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                      <SelectItem value="America/New_York">Eastern Time</SelectItem>
                      <SelectItem value="Europe/London">London</SelectItem>
                      <SelectItem value="Europe/Paris">Paris</SelectItem>
                      <SelectItem value="Asia/Tokyo">Tokyo</SelectItem>
                      <SelectItem value="UTC">UTC</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Date Format</Label>
                  <Select 
                    value={userPreferences.dateFormat} 
                    onValueChange={(v) => updateUserPreferences({ dateFormat: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="YYYY-MM-DD">2024-01-15</SelectItem>
                      <SelectItem value="MM/DD/YYYY">01/15/2024</SelectItem>
                      <SelectItem value="DD/MM/YYYY">15/01/2024</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Time Format</Label>
                  <Select 
                    value={userPreferences.timeFormat} 
                    onValueChange={(v) => updateUserPreferences({ timeFormat: v as '12h' | '24h' })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="12h">12-hour (2:30 PM)</SelectItem>
                      <SelectItem value="24h">24-hour (14:30)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Ruler className="h-5 w-5" />
                Units & Measurements
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label>Unit System</Label>
                <Select 
                  value={userPreferences.unitSystem} 
                  onValueChange={(v) => updateUserPreferences({ unitSystem: v as UnitSystem })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={UnitSystem.NAUTICAL}>Nautical (knots, nautical miles, meters)</SelectItem>
                    <SelectItem value={UnitSystem.METRIC}>Metric (km/h, km, meters)</SelectItem>
                    <SelectItem value={UnitSystem.IMPERIAL}>Imperial (mph, miles, feet)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  Affects speed, distance, depth, and temperature displays
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Account Settings */}
        <TabsContent value="account" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Account Session
              </CardTitle>
              <CardDescription>
                Account sessions stay on this browser and are excluded from local data exports.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {accountSession ? (
                <div className="space-y-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1">
                      <p className="font-medium">{accountSession.session.account.displayName}</p>
                      <p className="text-sm text-muted-foreground">{accountSession.session.account.email}</p>
                      <div className="flex flex-wrap gap-2 pt-2">
                        <Badge variant={accountSessionActive ? 'default' : 'destructive'}>
                          {accountSessionActive ? 'Signed in' : 'Expired'}
                        </Badge>
                        <Badge variant="secondary">{accountSession.session.account.status}</Badge>
                        {accountSession.session.account.roles.map((role) => (
                          <Badge key={role} variant="outline">{role}</Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" onClick={handleRefreshAccount} disabled={accountLoading}>
                        <RefreshCw className={cn('h-4 w-4 mr-2', accountLoading && 'animate-spin')} />
                        Refresh
                      </Button>
                      <Button variant="outline" onClick={handleSignOutAccount}>
                        <LogOut className="h-4 w-4 mr-2" />
                        Sign Out
                      </Button>
                    </div>
                  </div>
                  <Separator />
                  <div className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
                    <p>Saved {new Date(accountSession.savedAt).toLocaleString()}</p>
                    <p>Expires {new Date(accountSession.session.expiresAt).toLocaleString()}</p>
                    <p>Account ID {accountSession.session.account.id}</p>
                    <p>Key ID {accountSession.session.keyId}</p>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border p-4 text-sm text-muted-foreground">
                  No account session is saved on this browser.
                </div>
              )}
              {accountError && (
                <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive" role="alert">
                  {accountError}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <KeyRound className="h-5 w-5" />
                Register or Sign In
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={accountEmailInput}
                    onChange={(event) => setAccountEmailInput(event.target.value)}
                    placeholder="captain@example.com"
                    autoComplete="email"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Display Name</Label>
                  <Input
                    value={accountDisplayNameInput}
                    onChange={(event) => setAccountDisplayNameInput(event.target.value)}
                    placeholder="Captain"
                    autoComplete="name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Password</Label>
                  <Input
                    type="password"
                    value={accountPasswordInput}
                    onChange={(event) => setAccountPasswordInput(event.target.value)}
                    autoComplete={accountSession ? 'current-password' : 'new-password'}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Invite Code</Label>
                  <Input
                    value={accountInviteCodeInput}
                    onChange={(event) => setAccountInviteCodeInput(event.target.value)}
                    placeholder="Required when registration is invite-gated"
                    autoComplete="one-time-code"
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={handleRegisterAccount}
                  disabled={accountLoading || !accountEmailInput.trim() || !accountDisplayNameInput.trim() || !accountPasswordInput}
                >
                  {accountLoading ? 'Working' : 'Register Account'}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleLoginAccount}
                  disabled={accountLoading || !accountEmailInput.trim() || !accountPasswordInput}
                >
                  Sign In
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Appearance Settings */}
        <TabsContent value="appearance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Moon className="h-5 w-5" />
                Theme
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Theme Mode</p>
                    <p className="text-sm text-muted-foreground">
                      Choose your preferred color scheme
                    </p>
                  </div>
                  <Select 
                    value={userPreferences.theme} 
                    onValueChange={(v) => updateUserPreferences({ theme: v as ThemeMode })}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ThemeMode.DAY}>
                        <span className="flex items-center gap-2">
                          <Sun className="h-4 w-4" />
                          Day Mode
                        </span>
                      </SelectItem>
                      <SelectItem value={ThemeMode.NIGHT}>
                        <span className="flex items-center gap-2">
                          <Moon className="h-4 w-4" />
                          Night Mode
                        </span>
                      </SelectItem>
                      <SelectItem value={ThemeMode.AUTO}>
                        <span className="flex items-center gap-2">
                          <RefreshCw className="h-4 w-4" />
                          Auto (System)
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* AI Settings */}
        <TabsContent value="ai" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Bot className="h-5 w-5" />
                  AI Providers
                </CardTitle>
                <Button size="sm" onClick={() => setShowAddAI(true)}>
                  Add Provider
                </Button>
              </div>
              <CardDescription>
                Configure AI models for local and cloud processing
              </CardDescription>
            </CardHeader>
            <CardContent>
              {providers.length === 0 ? (
                <div className="text-center py-8">
                  <Bot className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                  <p className="text-muted-foreground">No AI providers configured</p>
                  <Button className="mt-3" onClick={() => setShowAddAI(true)}>
                    Add Your First Provider
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {providers.map((provider) => (
                    <div 
                      key={provider.id} 
                      className={cn(
                        'flex items-center justify-between p-4 rounded-lg border',
                        activeProvider?.id === provider.id && 'border-primary bg-primary/5'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          'p-2 rounded-lg',
                          provider.providerType === AIProviderType.LOCAL 
                            ? 'bg-emerald-50 text-emerald-500 dark:bg-emerald-950/30'
                            : 'bg-blue-50 text-blue-500 dark:bg-blue-950/30'
                        )}>
                          {provider.providerType === AIProviderType.LOCAL ? (
                            <CheckCircle2 className="h-5 w-5" />
                          ) : (
                            <Cloud className="h-5 w-5" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{provider.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {provider.providerType} • {provider.apiUrl}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={provider.isActive ? 'default' : 'secondary'}>
                          {provider.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => setActiveProvider(provider)}
                        >
                          {activeProvider?.id === provider.id ? 'Selected' : 'Select'}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                AI Privacy
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Allow Cloud Processing</p>
                  <p className="text-sm text-muted-foreground">
                    Send data to cloud AI when local model can't handle it
                  </p>
                </div>
                <Switch 
                  checked={consent?.allowAICloudProcessing || false}
                  onCheckedChange={(v) => consent && setConsent({ ...consent, allowAICloudProcessing: v })}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Allow Training Use</p>
                  <p className="text-sm text-muted-foreground">
                    Use anonymized interactions to improve AI models
                  </p>
                </div>
                <Switch 
                  checked={consent?.allowAITrainingUse || false}
                  onCheckedChange={(v) => consent && setConsent({ ...consent, allowAITrainingUse: v })}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Privacy Settings */}
        <TabsContent value="privacy" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Data Sharing Consent
              </CardTitle>
              <CardDescription>
                Control how your data is shared with the HarborMesh network
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Position Sharing */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Live Position Sharing</p>
                    <p className="text-sm text-muted-foreground">
                      Share your vessel's position with the community
                    </p>
                  </div>
                  <Select 
                    value={consent?.shareLivePosition || SharePositionLevel.NONE}
                    onValueChange={(v) => consent && setConsent({ ...consent, shareLivePosition: v as SharePositionLevel })}
                  >
                    <SelectTrigger className="w-[150px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={SharePositionLevel.NONE}>Off</SelectItem>
                      <SelectItem value={SharePositionLevel.BLURRED}>Blurred</SelectItem>
                      <SelectItem value={SharePositionLevel.FULL}>Full</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <Separator />
              
              {/* Telemetry Sharing */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Share Telemetry for Community</p>
                    <p className="text-sm text-muted-foreground">
                      Contribute to sea-state and traffic data
                    </p>
                  </div>
                  <Switch 
                    checked={consent?.shareTelemetryForCommunity || false}
                    onCheckedChange={(v) => consent && setConsent({ ...consent, shareTelemetryForCommunity: v })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Share Telemetry for Training</p>
                    <p className="text-sm text-muted-foreground">
                      Help improve routing and prediction models
                    </p>
                  </div>
                  <Switch 
                    checked={consent?.shareTelemetryForTraining || false}
                    onCheckedChange={(v) => consent && setConsent({ ...consent, shareTelemetryForTraining: v })}
                  />
                </div>
              </div>
              
              <Separator />
              
              {/* Enterprise Mode */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Enterprise Lockdown Mode</p>
                    <p className="text-sm text-muted-foreground">
                      Disable all external sharing for fleet operations
                    </p>
                  </div>
                  <Switch 
                    checked={consent?.enterpriseLockdownMode || false}
                    onCheckedChange={(v) => consent && setConsent({ ...consent, enterpriseLockdownMode: v })}
                  />
                </div>
              </div>
              
              <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
                <Info className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <p className="text-sm">
                  Your sensitive documents (passports, licenses, etc.) are never shared 
                  and are stored with encryption. They are never used for AI training.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Network Settings */}
        <TabsContent value="network" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <KeyRound className="h-5 w-5" />
                Pilot API Credentials
              </CardTitle>
              <CardDescription>
                Stored locally and excluded from local data exports.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>API Key</Label>
                  <Input
                    type="password"
                    value={pilotApiKeyInput}
                    onChange={(event) => setPilotApiKeyInput(event.target.value)}
                    placeholder="hm_..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Review Operator ID</Label>
                  <Input
                    value={pilotOperatorIdInput}
                    onChange={(event) => setPilotOperatorIdInput(event.target.value)}
                    placeholder="nb-ops-reviewer"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p>
                    {pilotCredentialsSavedAt
                      ? `Saved ${new Date(pilotCredentialsSavedAt).toLocaleString()}`
                      : 'No local pilot credentials saved'}
                  </p>
                  <p className={pilotReviewSessionActive ? 'text-emerald-700 dark:text-emerald-300' : undefined}>
                    {pilotReviewSessionExpiresAt
                      ? `Review session ${pilotReviewSessionActive ? 'active' : 'expired'} ${new Date(pilotReviewSessionExpiresAt).toLocaleString()}`
                      : 'No review session minted'}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={handleClearPilotApiCredentials}>
                    Clear
                  </Button>
                  <Button onClick={handleSavePilotApiCredentials}>
                    Save Credentials
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleCreatePilotReviewSession}
                    disabled={pilotReviewSessionLoading}
                  >
                    <RefreshCw className={cn('h-4 w-4 mr-2', pilotReviewSessionLoading && 'animate-spin')} />
                    {pilotReviewSessionActive ? 'Refresh Session' : 'Create Session'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wifi className="h-5 w-5" />
                Boat Node Connection
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
	              <div className="flex items-center justify-between">
	                <div>
	                  <p className="font-medium">Connection Status</p>
	                  <p className="text-sm text-muted-foreground">
	                    {connectionStatus === 'online' ? 'Telemetry source active' : connectionStatus}
	                  </p>
	                </div>
	                <Badge variant={connectionStatus === 'online' ? 'default' : 'destructive'}>
	                  {connectionStatus}
	                </Badge>
	              </div>
	              <Separator />
	              <div className="grid gap-4 sm:grid-cols-2">
	                <div className="space-y-2">
	                  <Label>Boat Node ID</Label>
	                  <Input
	                    value={boatNode.deviceId}
	                    onChange={(event) => updateBoatNodeSettings({ deviceId: event.target.value })}
	                  />
	                </div>
	                <div className="space-y-2">
	                  <Label>Boat Node Name</Label>
	                  <Input
	                    value={boatNode.deviceName}
	                    onChange={(event) => updateBoatNodeSettings({ deviceName: event.target.value })}
	                  />
	                </div>
	              </div>
	              <div className="space-y-2">
	                <Label>Telemetry Source</Label>
	                <Select
	                  value={boatNode.telemetryMode}
	                  onValueChange={(value) => updateBoatNodeSettings({ telemetryMode: value as TelemetryMode })}
	                >
	                  <SelectTrigger>
	                    <SelectValue />
	                  </SelectTrigger>
	                  <SelectContent>
	                    <SelectItem value="replay">Recorded Signal K replay</SelectItem>
	                    <SelectItem value="signalk">Live Signal K Boat Node</SelectItem>
	                    <SelectItem value="simulated">Generated simulation</SelectItem>
	                  </SelectContent>
	                </Select>
	              </div>
	              <div className="space-y-2">
	                <Label>Boat Node URL</Label>
	                <Input
	                  value={boatNode.signalKBaseUrl}
	                  onChange={(event) => updateBoatNodeSettings({ signalKBaseUrl: event.target.value })}
	                />
	                <p className="break-all text-xs text-muted-foreground">{signalKStreamUrl}</p>
	              </div>
	              <div className="space-y-2">
	                <Label>Signal K Subscription</Label>
	                <Select
	                  value={boatNode.signalKSubscribe}
	                  onValueChange={(value) => updateBoatNodeSettings({ signalKSubscribe: value as typeof boatNode.signalKSubscribe })}
	                >
	                  <SelectTrigger>
	                    <SelectValue />
	                  </SelectTrigger>
	                  <SelectContent>
	                    <SelectItem value="self">Self vessel</SelectItem>
	                    <SelectItem value="all">All vessel contexts</SelectItem>
	                    <SelectItem value="none">No automatic subscription</SelectItem>
	                  </SelectContent>
	                </Select>
	              </div>
	              <div className="space-y-2">
	                <Label>Connection Timeout (seconds)</Label>
	                <Input
	                  type="number"
	                  min={3}
	                  max={60}
	                  value={boatNode.connectionTimeoutSeconds}
	                  onChange={(event) => {
	                    const nextValue = Number(event.target.value);
	                    if (Number.isFinite(nextValue)) {
	                      updateBoatNodeSettings({ connectionTimeoutSeconds: Math.min(60, Math.max(3, nextValue)) });
	                    }
	                  }}
	                />
	              </div>
	              <div className="grid gap-4 sm:grid-cols-2">
	                <div className="space-y-2">
	                  <Label>Surface To Transducer (m)</Label>
	                  <Input
	                    type="number"
	                    step="0.1"
	                    min={0}
	                    value={boatNode.surfaceToTransducerMeters}
	                    onChange={(event) => {
	                      const nextValue = Number(event.target.value);
	                      if (Number.isFinite(nextValue)) {
	                        updateBoatNodeSettings({ surfaceToTransducerMeters: Math.max(0, nextValue) });
	                      }
	                    }}
	                  />
	                </div>
	                <div className="space-y-2">
	                  <Label>Transducer To Keel (m)</Label>
	                  <Input
	                    type="number"
	                    step="0.1"
	                    min={0}
	                    value={boatNode.transducerToKeelMeters}
	                    onChange={(event) => {
	                      const nextValue = Number(event.target.value);
	                      if (Number.isFinite(nextValue)) {
	                        updateBoatNodeSettings({ transducerToKeelMeters: Math.max(0, nextValue) });
	                      }
	                    }}
	                  />
	                </div>
	              </div>
	              <div className="flex items-center justify-between rounded-lg border p-3">
	                <div>
	                  <p className="font-medium">Fallback Replay</p>
	                  <p className="text-sm text-muted-foreground">Use recorded NB Signal K data if live Boat Node connection fails.</p>
	                </div>
	                <Switch
	                  checked={boatNode.fallbackToReplay}
	                  onCheckedChange={(checked) => updateBoatNodeSettings({ fallbackToReplay: checked })}
	                />
	              </div>
	              <div className="rounded-lg border p-3">
	                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
	                  <div>
	                    <p className="font-medium">Device Registration</p>
	                    <p className="text-sm text-muted-foreground">
	                      {boatNode.deviceRegisteredAt
	                        ? `Registered ${new Date(boatNode.deviceRegisteredAt).toLocaleString()}`
	                        : 'Not registered with the community API'}
	                    </p>
	                  </div>
	                  <Button size="sm" variant="outline" onClick={handleRegisterBoatNode} disabled={registeringDevice}>
	                    <Wifi className="mr-2 h-4 w-4" />
	                    {registeringDevice ? 'Registering' : 'Register Node'}
	                  </Button>
	                </div>
	                <div className="mt-3 flex flex-wrap gap-2">
	                  {Object.entries(boatNode.capabilities).map(([capability, enabled]) => (
	                    <Badge key={capability} variant={enabled ? 'default' : 'secondary'} className="capitalize">
	                      {capability}
	                    </Badge>
	                  ))}
	                </div>
	              </div>
	              <Button onClick={applyBoatNodeSettings}>
	                <RefreshCw className="h-4 w-4 mr-2" />
	                Apply Settings
	              </Button>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Data Settings */}
        <TabsContent value="data" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Data Management
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Storage Used</p>
                  <p className="text-sm text-muted-foreground">
                    Documents, logs, and cached data
                  </p>
                </div>
                <span className="font-medium">245 MB</span>
              </div>
              <Separator />
              <div className="space-y-2">
                <p className="font-medium">Data Retention</p>
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-muted-foreground">Telemetry history</span>
                  <Select defaultValue="30">
                    <SelectTrigger className="w-[150px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">7 days</SelectItem>
                      <SelectItem value="30">30 days</SelectItem>
                      <SelectItem value="90">90 days</SelectItem>
                      <SelectItem value="365">1 year</SelectItem>
                      <SelectItem value="forever">Forever</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-muted-foreground">Log entries</span>
                  <Select defaultValue="forever">
                    <SelectTrigger className="w-[150px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1year">1 year</SelectItem>
                      <SelectItem value="5years">5 years</SelectItem>
                      <SelectItem value="forever">Forever</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Separator />
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleExportLocalData}>
                  <Download className="h-4 w-4 mr-2" />
                  Export All Data
                </Button>
                <Button variant="outline" onClick={() => importInputRef.current?.click()}>
                  <Upload className="h-4 w-4 mr-2" />
                  Import Data
                </Button>
                <input
                  ref={importInputRef}
                  type="file"
                  accept="application/json,.json"
                  className="hidden"
                  onChange={handleImportLocalData}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Add AI Provider Dialog */}
      <Dialog open={showAddAI} onOpenChange={setShowAddAI}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add AI Provider</DialogTitle>
            <DialogDescription>
              Configure a new AI model provider
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input 
                placeholder="e.g., Local Ollama"
                value={newProvider.name}
                onChange={(e) => setNewProvider({ ...newProvider, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select 
                value={newProvider.providerType}
                onValueChange={(v) => setNewProvider({ ...newProvider, providerType: v as AIProviderType })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={AIProviderType.LOCAL}>Local (Ollama, LM Studio)</SelectItem>
                  <SelectItem value={AIProviderType.OPENAI}>OpenAI</SelectItem>
                  <SelectItem value={AIProviderType.ANTHROPIC}>Anthropic</SelectItem>
                  <SelectItem value={AIProviderType.CUSTOM}>Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>API URL</Label>
              <Input 
                placeholder="http://localhost:11434"
                value={newProvider.apiUrl}
                onChange={(e) => setNewProvider({ ...newProvider, apiUrl: e.target.value })}
              />
            </div>
            {newProvider.providerType !== AIProviderType.LOCAL && (
              <div className="space-y-2">
                <Label>API Key</Label>
                <Input 
                  type="password"
                  placeholder="Your API key"
                  value={newProvider.apiKey}
                  onChange={(e) => setNewProvider({ ...newProvider, apiKey: e.target.value })}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddAI(false)}>Cancel</Button>
            <Button onClick={handleAddProvider}>Add Provider</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Reset Confirmation Dialog */}
      <Dialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset All Data?</DialogTitle>
            <DialogDescription>
              This will permanently delete all your vessel data, logs, and settings. 
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResetConfirm(false)}>Cancel</Button>
            <Button variant="destructive" onClick={() => setShowResetConfirm(false)}>
              <Trash2 className="h-4 w-4 mr-2" />
              Reset Everything
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
