import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../api';
import '../pages/ProfilePage.css';

const EditProfileModal = ({ isOpen, onClose }) => {
  const { user, updateUser } = useAuth();
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [showCropModal, setShowCropModal] = useState(false);
  const [cropImage, setCropImage] = useState(null);
  const [cropScale, setCropScale] = useState(1);
  const [cropPosition, setCropPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const cropContainerRef = useRef(null);
  const cropImageRef = useRef(null);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showChangePasswordSection, setShowChangePasswordSection] = useState(false);
  const fileInputRef = useRef(null);
  const timeoutRef = useRef(null);
  const isMountedRef = useRef(true);
  const errorMessageRef = useRef(null);

  // Initialize form when modal opens
  useEffect(() => {
    if (isOpen) {
      setEditName(user?.name || '');
      setEditEmail(user?.email || '');
      setAvatarPreview(user?.avatar_url ? `http://localhost:8080${user.avatar_url}` : null);
      setSelectedAvatar(null);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setErrorMessage('');
      setSuccessMessage('');
      setShowChangePasswordSection(false);
    }
  }, [isOpen, user]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!isOpen && timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, [isOpen]);

  useEffect(() => {
    if (errorMessage && errorMessageRef.current && isOpen) {
      setTimeout(() => {
        errorMessageRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }, 100);
    }
  }, [errorMessage, isOpen]);

  useEffect(() => {
    if (showCropModal) {
      const handleMouseMove = (e) => {
        if (isDragging) {
          setCropPosition({
            x: e.clientX - dragStart.x,
            y: e.clientY - dragStart.y,
          });
        }
      };
      const handleMouseUp = () => setIsDragging(false);

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);

      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [showCropModal, isDragging, dragStart]);

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.charAt(0).toUpperCase();
  };

  const handleAvatarSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
      if (!validTypes.includes(file.type)) {
        setErrorMessage('Chỉ chấp nhận file ảnh (JPEG, PNG, GIF)');
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        setErrorMessage('File ảnh không được vượt quá 5MB');
        return;
      }

      setErrorMessage('');
      
      const reader = new FileReader();
      reader.onloadend = () => {
        if (isMountedRef.current && reader.result) {
          setCropImage(reader.result);
          setCropScale(1);
          setCropPosition({ x: 0, y: 0 });
          setShowCropModal(true);
        }
      };
      reader.onerror = () => {
        if (isMountedRef.current) {
          setErrorMessage('Lỗi khi đọc file ảnh');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCropZoom = (delta) => {
    setCropScale((prev) => Math.max(0.5, Math.min(3, prev + delta)));
  };

  const handleCropMouseDown = (e) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX - cropPosition.x,
      y: e.clientY - cropPosition.y,
    });
  };

  const handleCropImage = () => {
    if (!cropImage || !cropImageRef.current || !cropContainerRef.current) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const size = 400;
    canvas.width = size;
    canvas.height = size;

    const img = new Image();
    img.onload = () => {
      const container = cropContainerRef.current;
      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;
      const cropCircleSize = 250;
      
      const imgDisplayWidth = img.width * cropScale;
      const imgDisplayHeight = img.height * cropScale;
      
      const containerCenterX = containerWidth / 2;
      const containerCenterY = containerHeight / 2;
      
      const imgCenterX = containerCenterX + cropPosition.x;
      const imgCenterY = containerCenterY + cropPosition.y;
      
      const imgTopLeftX = imgCenterX - imgDisplayWidth / 2;
      const imgTopLeftY = imgCenterY - imgDisplayHeight / 2;
      
      const cropCircleCenterX = containerCenterX;
      const cropCircleCenterY = containerCenterY;
      
      const cropInImgX = cropCircleCenterX - imgTopLeftX;
      const cropInImgY = cropCircleCenterY - imgTopLeftY;
      
      const sourceX = (cropInImgX / imgDisplayWidth) * img.width - (cropCircleSize / imgDisplayWidth) * img.width / 2;
      const sourceY = (cropInImgY / imgDisplayHeight) * img.height - (cropCircleSize / imgDisplayHeight) * img.height / 2;
      const sourceSize = (cropCircleSize / imgDisplayWidth) * img.width;
      
      const finalSourceX = Math.max(0, Math.min(sourceX, img.width - sourceSize));
      const finalSourceY = Math.max(0, Math.min(sourceY, img.height - sourceSize));
      const finalSourceSize = Math.min(sourceSize, img.width - finalSourceX, img.height - finalSourceY);
      
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2, 0, 2 * Math.PI);
      ctx.clip();
      
      ctx.drawImage(
        img,
        finalSourceX, finalSourceY, finalSourceSize, finalSourceSize,
        0, 0, size, size
      );

      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], 'avatar.jpg', { type: 'image/jpeg' });
          setSelectedAvatar(file);
          setAvatarPreview(URL.createObjectURL(blob));
          setShowCropModal(false);
          setCropImage(null);
        }
      }, 'image/jpeg', 0.9);
    };
    img.src = cropImage;
  };

  const handleUpdateProfile = async () => {
    if (!editName.trim() || !editEmail.trim()) {
      setErrorMessage('Vui lòng nhập đầy đủ tên và email');
      return;
    }

    setIsUpdatingProfile(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const response = await authAPI.updateProfile(editName.trim(), editEmail.trim());
      if (response.success) {
        updateUser(response.data);
        setSuccessMessage('Cập nhật thông tin thành công!');
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(() => {
          onClose();
          timeoutRef.current = null;
        }, 1500);
      } else {
        setErrorMessage(response.error || 'Cập nhật thông tin thất bại');
      }
    } catch (error) {
      setErrorMessage('Có lỗi xảy ra khi cập nhật thông tin');
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (!oldPassword || !newPassword || !confirmPassword) {
      setErrorMessage('Vui lòng nhập đầy đủ thông tin');
      return;
    }

    if (newPassword.length < 6) {
      setErrorMessage('Mật khẩu mới phải có ít nhất 6 ký tự');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('Mật khẩu mới và xác nhận không khớp');
      return;
    }

    setIsChangingPassword(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const response = await authAPI.changePassword(oldPassword, newPassword);
      if (response.success) {
        setSuccessMessage('Đổi mật khẩu thành công!');
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(() => {
          onClose();
          timeoutRef.current = null;
        }, 1500);
      } else {
        setErrorMessage(response.error || 'Đổi mật khẩu thất bại');
      }
    } catch (error) {
      setErrorMessage('Có lỗi xảy ra khi đổi mật khẩu');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleUploadAvatar = async () => {
    if (!selectedAvatar) {
      setErrorMessage('Vui lòng chọn ảnh đại diện');
      return;
    }

    setIsUploadingAvatar(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const response = await authAPI.uploadAvatar(selectedAvatar);
      if (response.success) {
        updateUser(response.data);
        setSuccessMessage('Cập nhật ảnh đại diện thành công!');
        setSelectedAvatar(null);
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(() => {
          onClose();
          timeoutRef.current = null;
        }, 1500);
      } else {
        setErrorMessage(response.error || 'Upload avatar thất bại');
      }
    } catch (error) {
      setErrorMessage('Có lỗi xảy ra khi upload avatar');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Modal chỉnh sửa profile */}
      <div
        className="reason-modal-overlay"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            onClose();
          }
        }}
      >
        <div
          className="reason-modal-content edit-profile-modal"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="reason-modal-header">
            <h3>Chỉnh sửa hồ sơ cá nhân</h3>
            <button
              className="reason-modal-close"
              onClick={onClose}
              type="button"
            >
              ×
            </button>
          </div>
          <div className="reason-modal-body">
            {errorMessage && (
              <div
                ref={errorMessageRef}
                style={{
                  padding: '12px',
                  backgroundColor: '#fee',
                  color: '#c33',
                  borderRadius: '8px',
                  marginBottom: '16px',
                  fontSize: '14px'
                }}
              >
                {errorMessage}
              </div>
            )}
            {successMessage && (
              <div style={{
                padding: '12px',
                backgroundColor: '#efe',
                color: '#3c3',
                borderRadius: '8px',
                marginBottom: '16px',
                fontSize: '14px'
              }}>
                {successMessage}
              </div>
            )}

            {/* Upload Avatar Section */}
            <div style={{ marginBottom: '24px' }}>
              <h4 style={{ marginBottom: '12px', fontSize: '16px', fontWeight: '600' }}>Ảnh đại diện</h4>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div
                  style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '50%',
                    backgroundColor: '#667eea',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '32px',
                    fontWeight: 'bold',
                    backgroundImage: avatarPreview ? `url(${avatarPreview})` : 'none',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    flexShrink: 0,
                  }}
                >
                  {!avatarPreview && getInitials(user?.name)}
                </div>
                <div style={{ flex: 1 }}>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/gif"
                    onChange={handleAvatarSelect}
                    style={{ display: 'none' }}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      padding: '8px 16px',
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#667eea',
                      backgroundColor: '#f0f4ff',
                      border: '2px solid #667eea',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      marginBottom: '8px',
                    }}
                  >
                    Chọn ảnh
                  </button>
                  {selectedAvatar && (
                    <button
                      type="button"
                      onClick={handleUploadAvatar}
                      disabled={isUploadingAvatar}
                      style={{
                        padding: '8px 16px',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: 'white',
                        backgroundColor: isUploadingAvatar ? '#ccc' : '#667eea',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: isUploadingAvatar ? 'not-allowed' : 'pointer',
                        display: 'block',
                      }}
                    >
                      {isUploadingAvatar ? 'Đang upload...' : 'Lưu ảnh'}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Update Profile Section */}
            <div style={{ marginBottom: '24px' }}>
              <h4 style={{ marginBottom: '12px', fontSize: '16px', fontWeight: '600' }}>Thông tin cá nhân</h4>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
                  Tên
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    fontSize: '14px',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    boxSizing: 'border-box',
                  }}
                  placeholder="Nhập tên của bạn"
                />
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
                  Email
                </label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    fontSize: '14px',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    boxSizing: 'border-box',
                  }}
                  placeholder="Nhập email của bạn"
                />
              </div>
              <button
                type="button"
                onClick={handleUpdateProfile}
                disabled={isUpdatingProfile}
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: 'white',
                  backgroundColor: isUpdatingProfile ? '#ccc' : '#667eea',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: isUpdatingProfile ? 'not-allowed' : 'pointer',
                }}
              >
                {isUpdatingProfile ? 'Đang cập nhật...' : 'Cập nhật thông tin'}
              </button>
            </div>

            {/* Change Password Section */}
            <div>
              <button
                type="button"
                onClick={() => setShowChangePasswordSection(!showChangePasswordSection)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#667eea',
                  backgroundColor: '#f0f4ff',
                  border: '2px solid #667eea',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  marginBottom: showChangePasswordSection ? '16px' : '0',
                }}
              >
                <span>{showChangePasswordSection ? '▼' : '▶'}</span>
                <span>Đổi mật khẩu</span>
              </button>
              
              {showChangePasswordSection && (
                <div style={{
                  marginTop: '16px',
                  padding: '16px',
                  backgroundColor: '#f9fafb',
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb',
                }}>
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
                      Mật khẩu cũ
                    </label>
                    <input
                      type="password"
                      value={oldPassword}
                      onChange={(e) => setOldPassword(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        fontSize: '14px',
                        border: '1px solid #ddd',
                        borderRadius: '8px',
                        boxSizing: 'border-box',
                      }}
                      placeholder="Nhập mật khẩu cũ"
                    />
                  </div>
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
                      Mật khẩu mới
                    </label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        fontSize: '14px',
                        border: '1px solid #ddd',
                        borderRadius: '8px',
                        boxSizing: 'border-box',
                      }}
                      placeholder="Nhập mật khẩu mới (ít nhất 6 ký tự)"
                    />
                  </div>
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
                      Xác nhận mật khẩu mới
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        fontSize: '14px',
                        border: '1px solid #ddd',
                        borderRadius: '8px',
                        boxSizing: 'border-box',
                      }}
                      placeholder="Nhập lại mật khẩu mới"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleChangePassword}
                    disabled={isChangingPassword}
                    style={{
                      width: '100%',
                      padding: '10px 16px',
                      fontSize: '14px',
                      fontWeight: '600',
                      color: 'white',
                      backgroundColor: isChangingPassword ? '#ccc' : '#667eea',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: isChangingPassword ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {isChangingPassword ? 'Đang đổi mật khẩu...' : 'Đổi mật khẩu'}
                  </button>
                </div>
              )}
            </div>
          </div>
          <div className="reason-modal-footer">
            <button
              className="reason-modal-button"
              type="button"
              onClick={onClose}
            >
              Đóng
            </button>
          </div>
        </div>
      </div>

      {/* Modal crop avatar */}
      {showCropModal && cropImage && (
        <div
          className="reason-modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowCropModal(false);
              setCropImage(null);
            }
          }}
        >
          <div
            className="reason-modal-content edit-profile-modal"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '500px' }}
          >
            <div className="reason-modal-header">
              <h3>Căn chỉnh ảnh đại diện</h3>
              <button
                className="reason-modal-close"
                onClick={() => {
                  setShowCropModal(false);
                  setCropImage(null);
                }}
                type="button"
              >
                ×
              </button>
            </div>
            <div className="reason-modal-body">
              <div style={{ marginBottom: '16px' }}>
                <div
                  ref={cropContainerRef}
                  style={{
                    width: '100%',
                    height: '300px',
                    position: 'relative',
                    overflow: 'hidden',
                    borderRadius: '8px',
                    backgroundColor: '#f3f4f6',
                    border: '2px solid #e5e7eb',
                    cursor: isDragging ? 'grabbing' : 'grab',
                  }}
                  onMouseDown={handleCropMouseDown}
                >
                  <img
                    ref={cropImageRef}
                    src={cropImage}
                    alt="Crop preview"
                    style={{
                      position: 'absolute',
                      left: '50%',
                      top: '50%',
                      transform: `translate(-50%, -50%) translate(${cropPosition.x}px, ${cropPosition.y}px) scale(${cropScale})`,
                      maxWidth: 'none',
                      height: 'auto',
                      userSelect: 'none',
                      pointerEvents: 'none',
                    }}
                    draggable={false}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      left: '50%',
                      top: '50%',
                      transform: 'translate(-50%, -50%)',
                      width: '250px',
                      height: '250px',
                      borderRadius: '50%',
                      border: '3px solid white',
                      boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)',
                      pointerEvents: 'none',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '16px' }}>
                <button
                  type="button"
                  onClick={() => handleCropZoom(-0.1)}
                  style={{
                    padding: '8px 16px',
                    fontSize: '16px',
                    fontWeight: '600',
                    color: '#667eea',
                    backgroundColor: '#f0f4ff',
                    border: '2px solid #667eea',
                    borderRadius: '8px',
                    cursor: 'pointer',
                  }}
                >
                  −
                </button>
                <span style={{ fontSize: '14px', color: '#666', minWidth: '60px', textAlign: 'center' }}>
                  {Math.round(cropScale * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => handleCropZoom(0.1)}
                  style={{
                    padding: '8px 16px',
                    fontSize: '16px',
                    fontWeight: '600',
                    color: '#667eea',
                    backgroundColor: '#f0f4ff',
                    border: '2px solid #667eea',
                    borderRadius: '8px',
                    cursor: 'pointer',
                  }}
                >
                  +
                </button>
              </div>

              <div style={{ fontSize: '13px', color: '#666', textAlign: 'center', marginBottom: '16px' }}>
                Kéo ảnh để căn chỉnh vị trí, dùng + và − để phóng to/thu nhỏ
              </div>
            </div>
            <div className="reason-modal-footer">
              <button
                className="reason-modal-button"
                type="button"
                onClick={() => {
                  setShowCropModal(false);
                  setCropImage(null);
                }}
                style={{ marginRight: '8px', backgroundColor: '#6b7280' }}
              >
                Hủy
              </button>
              <button
                className="reason-modal-button"
                type="button"
                onClick={handleCropImage}
              >
                Áp dụng
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default EditProfileModal;

