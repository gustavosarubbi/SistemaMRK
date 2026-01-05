import { ProjectNote, ProjectAttachment } from '@/types';

const NOTES_STORAGE_KEY = 'project_notes';
const ATTACHMENTS_STORAGE_KEY = 'project_attachments';

// ==================== NOTES ====================

export function getNotesFromStorage(projectId: string): ProjectNote[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const allNotes = JSON.parse(localStorage.getItem(NOTES_STORAGE_KEY) || '{}');
    return allNotes[projectId] || [];
  } catch {
    return [];
  }
}

export function saveNoteToStorage(projectId: string, note: ProjectNote): void {
  if (typeof window === 'undefined') return;
  
  try {
    const allNotes = JSON.parse(localStorage.getItem(NOTES_STORAGE_KEY) || '{}');
    if (!allNotes[projectId]) {
      allNotes[projectId] = [];
    }
    
    const existingIndex = allNotes[projectId].findIndex((n: ProjectNote) => n.id === note.id);
    if (existingIndex >= 0) {
      allNotes[projectId][existingIndex] = note;
    } else {
      allNotes[projectId].push(note);
    }
    
    localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(allNotes));
  } catch (error) {
    console.error('Erro ao salvar nota no localStorage:', error);
  }
}

export function deleteNoteFromStorage(projectId: string, noteId: string): void {
  if (typeof window === 'undefined') return;
  
  try {
    const allNotes = JSON.parse(localStorage.getItem(NOTES_STORAGE_KEY) || '{}');
    if (allNotes[projectId]) {
      allNotes[projectId] = allNotes[projectId].filter((n: ProjectNote) => n.id !== noteId);
      localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(allNotes));
    }
  } catch (error) {
    console.error('Erro ao deletar nota do localStorage:', error);
  }
}

// ==================== ATTACHMENTS ====================

export function getAttachmentsFromStorage(projectId: string): ProjectAttachment[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const allAttachments = JSON.parse(localStorage.getItem(ATTACHMENTS_STORAGE_KEY) || '{}');
    return allAttachments[projectId] || [];
  } catch {
    return [];
  }
}

export function saveAttachmentToStorage(projectId: string, attachment: ProjectAttachment): void {
  if (typeof window === 'undefined') return;
  
  try {
    const allAttachments = JSON.parse(localStorage.getItem(ATTACHMENTS_STORAGE_KEY) || '{}');
    if (!allAttachments[projectId]) {
      allAttachments[projectId] = [];
    }
    
    const existingIndex = allAttachments[projectId].findIndex(
      (a: ProjectAttachment) => a.id === attachment.id
    );
    if (existingIndex >= 0) {
      allAttachments[projectId][existingIndex] = attachment;
    } else {
      allAttachments[projectId].push(attachment);
    }
    
    localStorage.setItem(ATTACHMENTS_STORAGE_KEY, JSON.stringify(allAttachments));
  } catch (error) {
    console.error('Erro ao salvar anexo no localStorage:', error);
  }
}

export function deleteAttachmentFromStorage(projectId: string, attachmentId: string): void {
  if (typeof window === 'undefined') return;
  
  try {
    const allAttachments = JSON.parse(localStorage.getItem(ATTACHMENTS_STORAGE_KEY) || '{}');
    if (allAttachments[projectId]) {
      allAttachments[projectId] = allAttachments[projectId].filter(
        (a: ProjectAttachment) => a.id !== attachmentId
      );
      localStorage.setItem(ATTACHMENTS_STORAGE_KEY, JSON.stringify(allAttachments));
    }
  } catch (error) {
    console.error('Erro ao deletar anexo do localStorage:', error);
  }
}

// Salvar arquivo como base64 no localStorage (para anexos)
export function saveFileToStorage(attachmentId: string, file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('window is not available'));
      return;
    }
    
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const base64 = reader.result as string;
        localStorage.setItem(`attachment_file_${attachmentId}`, base64);
        resolve(base64);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function getFileFromStorage(attachmentId: string): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(`attachment_file_${attachmentId}`);
}

export function deleteFileFromStorage(attachmentId: string): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(`attachment_file_${attachmentId}`);
}






