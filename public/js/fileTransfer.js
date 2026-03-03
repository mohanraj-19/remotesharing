/**
 * File Transfer Implementation
 */

let fileTransferInProgress = false;
let currentFileID;
let receivedChunks = {};

/**
 * Open File Transfer
 */
function openFileTransfer() {
  const filePanel = document.getElementById('file-panel');
  const chatPanel = document.getElementById('chat-panel');
  
  if (filePanel) {
    filePanel.style.display = filePanel.style.display === 'none' ? 'block' : 'none';
  }
  
  if (chatPanel && filePanel.style.display !== 'none') {
    chatPanel.style.display = 'none';
  }
}

/**
 * Select File
 */
function selectFile() {
  const fileInput = document.getElementById('file-input');
  if (fileInput) {
    fileInput.click();
  }
}

/**
 * Handle File Selection
 */
document.addEventListener('DOMContentLoaded', () => {
  const fileInput = document.getElementById('file-input');
  
  if (fileInput) {
    fileInput.addEventListener('change', handleFileSelect);
  }
});

/**
 * Handle File Selection Event
 */
function handleFileSelect(event) {
  const files = event.target.files;
  
  if (files.length === 0) return;

  // Send first file
  const file = files[0];
  sendFile(file);
}

/**
 * Send File
 */
async function sendFile(file) {
  console.log('Sending file:', file.name, file.size);

  if (!socket || !socket.connected) {
    showNotification('Not connected to server', 'error');
    return;
  }

  if (file.size > (window.maxFileSize || 1073741824)) {
    showNotification('File too large', 'error');
    return;
  }

  fileTransferInProgress = true;
  currentFileID = `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Show progress
  const fileProgress = document.getElementById('file-progress');
  const fileName = document.getElementById('file-name');
  const progressFill = document.getElementById('progress-fill');
  const progressText = document.getElementById('progress-text');

  if (fileProgress) fileProgress.style.display = 'block';
  if (fileName) fileName.textContent = file.name;

  // Notify receiver
  socket.emit('start-file-transfer', {
    targetUserID: connectedUserID,
    fileName: file.name,
    fileSize: file.size,
    fileID: currentFileID
  });

  // Send in chunks
  const chunkSize = window.chunkSize || 65536;
  const totalChunks = Math.ceil(file.size / chunkSize);
  let sentChunks = 0;

  for (let i = 0; i < file.size; i += chunkSize) {
    const chunk = file.slice(i, i + chunkSize);
    const chunkIndex = Math.floor(i / chunkSize);

    await new Promise((resolve) => {
      const reader = new FileReader();

      reader.onload = () => {
        socket.emit('file-transfer-chunk', {
          targetUserID: connectedUserID,
          fileID: currentFileID,
          chunk: reader.result,
          chunkIndex,
          totalChunks
        });

        sentChunks++;
        const progress = (sentChunks / totalChunks) * 100;
        
        if (progressFill) progressFill.style.width = progress + '%';
        if (progressText) progressText.textContent = Math.round(progress) + '%';

        setTimeout(resolve, 10);
      };

      reader.readAsArrayBuffer(chunk);
    });
  }

  // File transfer complete
  socket.emit('file-transfer-complete', {
    targetUserID: connectedUserID,
    fileID: currentFileID,
    fileName: file.name
  });

  fileTransferInProgress = false;
  
  if (fileProgress) {
    setTimeout(() => {
      fileProgress.style.display = 'none';
      progressFill.style.width = '0%';
      progressText.textContent = '0%';
    }, 2000);
  }

  showNotification('File sent successfully', 'success');
  console.log('File transfer complete');
}

/**
 * Handle Incoming File Transfer Request
 */
function handleFileTransferRequest(data) {
  console.log('Incoming file transfer request:', data);

  const { fromUserID, fileName, fileSize, fileID } = data;

  receivedChunks[fileID] = {
    chunks: [],
    fileName,
    fileSize,
    received: 0
  };

  const notificationMessage = `${fromUserID} is sending file: ${fileName} (${formatBytes(fileSize)})`;
  showNotification(notificationMessage, 'info');
}

/**
 * Handle File Transfer Chunk
 */
function handleFileTransferChunk(data) {
  const { fileID, chunk, chunkIndex, totalChunks } = data;

  if (!receivedChunks[fileID]) {
    console.error('Unknown file transfer:', fileID);
    return;
  }

  receivedChunks[fileID].chunks[chunkIndex] = chunk;
  receivedChunks[fileID].received++;

  const progress = (receivedChunks[fileID].received / totalChunks) * 100;
  console.log(`File transfer progress: ${Math.round(progress)}%`);
}

/**
 * Handle File Transfer Complete
 */
function handleFileTransferComplete(data) {
  const { fileID, fileName } = data;

  if (!receivedChunks[fileID]) {
    console.error('Unknown file transfer:', fileID);
    return;
  }

  console.log('File transfer complete:', fileName);

  // Combine chunks into blob
  const chunks = receivedChunks[fileID].chunks;
  const blob = new Blob(chunks, { type: 'application/octet-stream' });

  // Download file
  downloadFile(blob, fileName);

  showNotification(`File received: ${fileName}`, 'success');

  // Cleanup
  delete receivedChunks[fileID];
}

/**
 * Drag and drop file upload
 */
function setupDragDropFileUpload() {
  const filePanel = document.getElementById('file-panel');
  
  if (!filePanel) return;

  filePanel.addEventListener('dragover', (e) => {
    e.preventDefault();
    filePanel.style.backgroundColor = '#f0f0f0';
  });

  filePanel.addEventListener('dragleave', () => {
    filePanel.style.backgroundColor = 'transparent';
  });

  filePanel.addEventListener('drop', (e) => {
    e.preventDefault();
    filePanel.style.backgroundColor = 'transparent';

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      sendFile(files[0]);
    }
  });
}

// Listen for file transfer events
if (socket) {
  socket.off('file-transfer-request');
  socket.off('file-transfer-chunk');
  socket.off('file-transfer-complete');

  socket.on('file-transfer-request', handleFileTransferRequest);
  socket.on('file-transfer-chunk', handleFileTransferChunk);
  socket.on('file-transfer-complete', handleFileTransferComplete);
}

// Setup drag and drop when document loads
document.addEventListener('DOMContentLoaded', setupDragDropFileUpload);
