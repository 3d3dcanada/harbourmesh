/**
 * HarborMesh - Store Tests
 * Zero-Tolerance Quality Assurance - Functional Testing
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAppStore, useVesselStore, useDocumentStore, useLogTaskStore } from './index';
import { createMockVessel, createMockLogEntry, createMockTask, createMockDocument, createMockItem } from '../test/setup';

describe('App Store', () => {
  beforeEach(() => {
    // Reset store state before each test
    useAppStore.setState({
      sidebarOpen: true,
      activeView: 'dashboard',
      theme: 'auto',
      connectionStatus: 'offline',
      notifications: [],
      activeModal: undefined,
      modalData: undefined,
    });
  });

  it('should toggle sidebar', () => {
    const { result } = renderHook(() => useAppStore());
    
    expect(result.current.sidebarOpen).toBe(true);
    
    act(() => {
      result.current.toggleSidebar();
    });
    
    expect(result.current.sidebarOpen).toBe(false);
  });

  it('should set active view', () => {
    const { result } = renderHook(() => useAppStore());
    
    act(() => {
      result.current.setActiveView('vessel');
    });
    
    expect(result.current.activeView).toBe('vessel');
  });

  it('should set theme', () => {
    const { result } = renderHook(() => useAppStore());
    
    act(() => {
      result.current.setTheme('dark');
    });
    
    expect(result.current.theme).toBe('dark');
  });

  it('should set connection status', () => {
    const { result } = renderHook(() => useAppStore());
    
    act(() => {
      result.current.setConnectionStatus('online');
    });
    
    expect(result.current.connectionStatus).toBe('online');
  });

  it('should add notifications', () => {
    const { result } = renderHook(() => useAppStore());
    
    act(() => {
      result.current.addNotification({
        type: 'info',
        title: 'Test Notification',
        message: 'This is a test',
      });
    });
    
    expect(result.current.notifications.length).toBe(1);
    expect(result.current.notifications[0].title).toBe('Test Notification');
    expect(result.current.notifications[0].read).toBe(false);
  });

  it('should limit notifications to 50', () => {
    const { result } = renderHook(() => useAppStore());
    
    act(() => {
      for (let i = 0; i < 60; i++) {
        result.current.addNotification({
          type: 'info',
          title: `Notification ${i}`,
          message: 'Test',
        });
      }
    });
    
    expect(result.current.notifications.length).toBe(50);
  });

  it('should mark notification as read', () => {
    const { result } = renderHook(() => useAppStore());
    
    act(() => {
      result.current.addNotification({
        type: 'info',
        title: 'Test',
        message: 'Test',
      });
    });
    
    const notificationId = result.current.notifications[0].id;
    
    act(() => {
      result.current.markNotificationRead(notificationId);
    });
    
    expect(result.current.notifications[0].read).toBe(true);
  });

  it('should open and close modal', () => {
    const { result } = renderHook(() => useAppStore());
    
    act(() => {
      result.current.openModal('vesselForm', { mode: 'create' });
    });
    
    expect(result.current.activeModal).toBe('vesselForm');
    expect(result.current.modalData).toEqual({ mode: 'create' });
    
    act(() => {
      result.current.closeModal();
    });
    
    expect(result.current.activeModal).toBeUndefined();
    expect(result.current.modalData).toBeUndefined();
  });
});

describe('Vessel Store', () => {
  beforeEach(() => {
    useVesselStore.setState({
      vessels: [],
      currentVessel: null,
      spaces: [],
      items: [],
      systems: [],
    });
  });

  it('should add vessel', () => {
    const { result } = renderHook(() => useVesselStore());
    const mockVessel = createMockVessel();
    
    act(() => {
      result.current.addVessel(mockVessel);
    });
    
    expect(result.current.vessels.length).toBe(1);
    expect(result.current.vessels[0].name).toBe('Test Vessel');
  });

  it('should update vessel', () => {
    const { result } = renderHook(() => useVesselStore());
    const mockVessel = createMockVessel();
    
    act(() => {
      result.current.addVessel(mockVessel);
      result.current.updateVessel(mockVessel.id, { name: 'Updated Vessel' });
    });
    
    expect(result.current.vessels[0].name).toBe('Updated Vessel');
  });

  it('should delete vessel', () => {
    const { result } = renderHook(() => useVesselStore());
    const mockVessel = createMockVessel();
    
    act(() => {
      result.current.addVessel(mockVessel);
      result.current.deleteVessel(mockVessel.id);
    });
    
    expect(result.current.vessels.length).toBe(0);
  });

  it('should set current vessel', () => {
    const { result } = renderHook(() => useVesselStore());
    const mockVessel = createMockVessel();
    
    act(() => {
      result.current.addVessel(mockVessel);
      result.current.setCurrentVessel(mockVessel);
    });
    
    expect(result.current.currentVessel?.id).toBe(mockVessel.id);
  });

  it('should add space', () => {
    const { result } = renderHook(() => useVesselStore());
    
    act(() => {
      result.current.setSpaces([
        { id: 'space-1', vesselId: 'vessel-1', name: 'Cockpit', type: 'cockpit' } as any,
      ]);
    });
    
    expect(result.current.spaces.length).toBe(1);
  });

  it('should add item', () => {
    const { result } = renderHook(() => useVesselStore());
    const mockItem = createMockItem();
    
    act(() => {
      result.current.addItem(mockItem);
    });
    
    expect(result.current.items.length).toBe(1);
    expect(result.current.items[0].name).toBe('Test Item');
  });

  it('should update item', () => {
    const { result } = renderHook(() => useVesselStore());
    const mockItem = createMockItem();
    
    act(() => {
      result.current.addItem(mockItem);
      result.current.updateItem(mockItem.id, { quantity: 5 });
    });
    
    expect(result.current.items[0].quantity).toBe(5);
  });
});

describe('Document Store', () => {
  beforeEach(() => {
    useDocumentStore.setState({
      documents: [],
      selectedDocument: null,
      isLoading: false,
    });
  });

  it('should add document', () => {
    const { result } = renderHook(() => useDocumentStore());
    const mockDocument = createMockDocument();
    
    act(() => {
      result.current.addDocument(mockDocument);
    });
    
    expect(result.current.documents.length).toBe(1);
  });

  it('should get documents by type', () => {
    const { result } = renderHook(() => useDocumentStore());
    const mockDoc1 = createMockDocument({ type: 'manual' });
    const mockDoc2 = createMockDocument({ type: 'survey' });
    const mockDoc3 = createMockDocument({ type: 'manual' });
    
    act(() => {
      result.current.setDocuments([mockDoc1, mockDoc2, mockDoc3]);
    });
    
    const manuals = result.current.getDocumentsByType('manual');
    expect(manuals.length).toBe(2);
  });

  it('should get documents by vessel', () => {
    const { result } = renderHook(() => useDocumentStore());
    const mockDoc1 = createMockDocument({ vesselId: 'vessel-1' });
    const mockDoc2 = createMockDocument({ vesselId: 'vessel-2' });
    
    act(() => {
      result.current.setDocuments([mockDoc1, mockDoc2]);
    });
    
    const vessel1Docs = result.current.getDocumentsByVessel('vessel-1');
    expect(vessel1Docs.length).toBe(1);
  });

  it('should get expiring documents', () => {
    const { result } = renderHook(() => useDocumentStore());
    
    const now = new Date();
    const expiringDoc = createMockDocument({
      metadata: {
        expiryDate: new Date(now.getTime() + 7 * 86400000).toISOString(),
        tags: [],
      },
    });
    const validDoc = createMockDocument({
      id: 'doc-2',
      metadata: {
        expiryDate: new Date(now.getTime() + 365 * 86400000).toISOString(),
        tags: [],
      },
    });
    
    act(() => {
      result.current.setDocuments([expiringDoc, validDoc]);
    });
    
    const expiringIn30Days = result.current.getExpiringDocuments(30);
    expect(expiringIn30Days.length).toBe(1);
  });

  it('should select document', () => {
    const { result } = renderHook(() => useDocumentStore());
    const mockDocument = createMockDocument();
    
    act(() => {
      result.current.selectDocument(mockDocument);
    });
    
    expect(result.current.selectedDocument?.id).toBe(mockDocument.id);
  });
});

describe('Log & Task Store', () => {
  beforeEach(() => {
    useLogTaskStore.setState({
      logs: [],
      tasks: [],
      selectedLog: null,
      selectedTask: null,
    });
  });

  it('should add log entry', () => {
    const { result } = renderHook(() => useLogTaskStore());
    const mockLog = createMockLogEntry();
    
    act(() => {
      result.current.addLog(mockLog);
    });
    
    expect(result.current.logs.length).toBe(1);
    expect(result.current.logs[0].title).toBe('Test Voyage');
  });

  it('should add task', () => {
    const { result } = renderHook(() => useLogTaskStore());
    const mockTask = createMockTask();
    
    act(() => {
      result.current.addTask(mockTask);
    });
    
    expect(result.current.tasks.length).toBe(1);
    expect(result.current.tasks[0].status).toBe('open');
  });

  it('should complete task', () => {
    const { result } = renderHook(() => useLogTaskStore());
    const mockTask = createMockTask();
    
    act(() => {
      result.current.addTask(mockTask);
      result.current.completeTask(mockTask.id, 'test-user-001', 'Completed successfully');
    });
    
    expect(result.current.tasks[0].status).toBe('complete');
  });

  it('should approve task', () => {
    const { result } = renderHook(() => useLogTaskStore());
    const mockTask = createMockTask({ status: 'needs_approval' as const });
    
    act(() => {
      result.current.addTask(mockTask);
      result.current.approveTask(mockTask.id, {
        approverId: 'captain-001',
        approverName: 'Captain Smith',
        status: 'approved',
        note: 'Looks good',
      });
    });
    
    expect(result.current.tasks[0].status).toBe('complete');
  });

  it('should get open tasks', () => {
    const { result } = renderHook(() => useLogTaskStore());
    
    const openTask = createMockTask({ status: 'open' as const });
    const progressTask = createMockTask({ id: 'task-2', status: 'in_progress' as const });
    const completeTask = createMockTask({ id: 'task-3', status: 'complete' as const });
    
    act(() => {
      result.current.setTasks([openTask, progressTask, completeTask]);
    });
    
    const openTasks = result.current.getOpenTasks();
    expect(openTasks.length).toBe(2);
  });

  it('should get overdue tasks', () => {
    const { result } = renderHook(() => useLogTaskStore());
    
    const overdueTask = createMockTask({
      status: 'open' as const,
      dueDate: new Date(Date.now() - 86400000).toISOString(),
    });
    const futureTask = createMockTask({
      id: 'task-2',
      status: 'open' as const,
      dueDate: new Date(Date.now() + 86400000).toISOString(),
    });
    
    act(() => {
      result.current.setTasks([overdueTask, futureTask]);
    });
    
    const overdueTasks = result.current.getOverdueTasks();
    expect(overdueTasks.length).toBe(1);
  });
});
