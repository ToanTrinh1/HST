import { useRef, useState } from 'react';
import './ChatInput.css';

const MAX_IMAGE_SIZE_MB = 5;
const ACCEPT_IMAGE = 'image/jpeg,image/jpg,image/png,image/gif';

const ChatInput = ({
  value,
  onChange,
  onSend,
  onSendWithImage,
  placeholder = 'Nhập tin nhắn...',
  disabled = false,
  className = '',
}) => {
  const fileInputRef = useRef(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploadError, setUploadError] = useState('');

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  const handleImageClick = () => {
    if (disabled) return;
    fileInputRef.current?.click();
  };

  const setImageFromFile = (file) => {
    setUploadError('');
    if (!file || !file.type?.match(/^image\/(jpeg|jpg|png|gif)$/)) {
      setUploadError('Chỉ chấp nhận ảnh (JPEG, PNG, GIF)');
      return;
    }
    if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
      setUploadError(`Ảnh không được vượt quá ${MAX_IMAGE_SIZE_MB}MB`);
      return;
    }
    setSelectedImage(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setImageFromFile(file);
  };

  const handlePaste = (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          setImageFromFile(file);
        }
        break;
      }
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    setUploadError('');
  };

  const handleSubmit = () => {
    if (disabled) return;
    const content = value?.trim() || '';
    if (selectedImage) {
      if (onSendWithImage) {
        onSendWithImage(content, selectedImage);
        removeImage();
      }
    } else {
      if (content && onSend) onSend();
    }
  };

  const canSend = (value?.trim() || '') || selectedImage;

  return (
    <div className={`chat-input-container ${className}`}>
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPT_IMAGE}
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
      {imagePreview && (
        <div className="chat-input-preview">
          <img src={imagePreview} alt="Preview" />
          <button type="button" className="chat-input-preview-remove" onClick={removeImage} aria-label="Xóa ảnh">
            ×
          </button>
          {uploadError && <span className="chat-input-error">{uploadError}</span>}
        </div>
      )}
      <div className="chat-input-row">
        <button
          type="button"
          className="chat-input-btn-icon"
          onClick={handleImageClick}
          disabled={disabled}
          aria-label="Chọn ảnh"
          title="Gửi ảnh"
        >
          🖼️
        </button>
        <input
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          disabled={disabled}
        />
        <button
          type="button"
          onClick={handleSubmit}
          disabled={disabled || !canSend}
        >
          Gửi
        </button>
      </div>
    </div>
  );
};

export default ChatInput;
