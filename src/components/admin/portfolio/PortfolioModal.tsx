import { useState } from 'react';
import Icon from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { PortfolioProject } from './types';

interface PortfolioModalProps {
  project: PortfolioProject;
  onClose: () => void;
  onSave: () => void;
  onChange: (project: PortfolioProject) => void;
}

type ViewMode = 'desktop' | 'tablet' | 'mobile';

export const PortfolioModal = ({ project, onClose, onSave, onChange }: PortfolioModalProps) => {
  const [viewMode, setViewMode] = useState<ViewMode>('desktop');
  const [isUploading, setIsUploading] = useState(false);
  const [newImageUrl, setNewImageUrl] = useState('');
  
  const galleryImages = project.gallery_images || [];
  
  const getPreviewDimensions = () => {
    switch (viewMode) {
      case 'desktop': return { width: '100%', height: '500px' };
      case 'tablet': return { width: '768px', height: '450px', margin: '0 auto' };
      case 'mobile': return { width: '375px', height: '667px', margin: '0 auto' };
    }
  };
  
  const uploadImage = async (file: File, field: 'carousel_image_url' | 'preview_image_url' | 'image_url') => {
    setIsUploading(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        try {
          const response = await fetch('https://functions.poehali.dev/a8a5e4db-ce2f-4430-931d-8b7e67ea6e9d', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: base64, filename: file.name })
          });
          const data = await response.json();
          if (data.url) {
            onChange({ ...project, [field]: data.url });
          }
        } catch (error) {
          console.error('Upload failed:', error);
          alert('Ошибка загрузки изображения');
        } finally {
          setIsUploading(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('File read error:', error);
      setIsUploading(false);
    }
  };

  const uploadGalleryImage = async (file: File) => {
    if (galleryImages.length >= 5) {
      alert('Максимум 5 изображений в галерее');
      return;
    }
    
    setIsUploading(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        try {
          const response = await fetch('https://functions.poehali.dev/a8a5e4db-ce2f-4430-931d-8b7e67ea6e9d', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: base64, filename: file.name })
          });
          const data = await response.json();
          if (data.url) {
            onChange({ 
              ...project, 
              gallery_images: [...galleryImages, data.url]
            });
          }
        } catch (error) {
          console.error('Upload failed:', error);
          alert('Ошибка загрузки изображения');
        } finally {
          setIsUploading(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('File read error:', error);
      setIsUploading(false);
    }
  };

  const addImageByUrl = () => {
    if (!newImageUrl.trim()) return;
    
    if (galleryImages.length >= 5) {
      alert('Максимум 5 изображений в галерее');
      return;
    }

    onChange({ 
      ...project, 
      gallery_images: [...galleryImages, newImageUrl.trim()]
    });
    setNewImageUrl('');
  };

  const removeGalleryImage = (index: number) => {
    const updated = galleryImages.filter((_, i) => i !== index);
    onChange({ ...project, gallery_images: updated });
  };

  const removeImage = (field: 'carousel_image_url' | 'preview_image_url' | 'image_url') => {
    onChange({ ...project, [field]: '' });
  };

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-4xl w-full my-8">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center sticky top-0 bg-white dark:bg-gray-800 z-10">
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {project.id ? 'Редактировать проект' : 'Новый проект'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <Icon name="X" size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-gray-100">
              Название проекта <span className="text-red-500">*</span>
              <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                ({project.title.length}/10 символов)
              </span>
            </label>
            <Input
              value={project.title}
              onChange={(e) =>
                onChange({ ...project, title: e.target.value.slice(0, 10) })
              }
              placeholder="Макс 10 символов"
              maxLength={10}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-gray-100">
              Описание
            </label>
            <Textarea
              value={project.description}
              onChange={(e) =>
                onChange({ ...project, description: e.target.value })
              }
              placeholder="Краткое описание проекта"
              rows={3}
            />
          </div>

          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-900/50">
            <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
              <Icon name="Image" size={18} />
              Основные изображения
            </h4>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-gray-100">
                  1. Основное изображение <span className="text-red-500">*</span>
                  <span className="text-xs text-gray-500 ml-2">Для карусели и карточек</span>
                </label>
                <div className="flex gap-2">
                  <Input
                    type="file"
                    accept="image/*"
                    disabled={isUploading}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) uploadImage(file, 'image_url');
                    }}
                    className="flex-1"
                  />
                  {project.image_url && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeImage('image_url')}
                      className="text-red-600"
                    >
                      <Icon name="Trash2" size={16} />
                    </Button>
                  )}
                </div>
                {project.image_url && (
                  <div className="mt-2 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 relative group">
                    <img src={project.image_url} alt="Main" className="w-full h-40 object-cover" />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-gray-100">
                  2. Превью (опционально)
                  <span className="text-xs text-gray-500 ml-2">Для миниатюр</span>
                </label>
                <div className="flex gap-2">
                  <Input
                    type="file"
                    accept="image/*"
                    disabled={isUploading}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) uploadImage(file, 'preview_image_url');
                    }}
                    className="flex-1"
                  />
                  {project.preview_image_url && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeImage('preview_image_url')}
                      className="text-red-600"
                    >
                      <Icon name="Trash2" size={16} />
                    </Button>
                  )}
                </div>
                {project.preview_image_url && (
                  <div className="mt-2 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                    <img src={project.preview_image_url} alt="Preview" className="w-full h-24 object-cover" />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-gray-100">
                  3. Для карусели (опционально)
                  <span className="text-xs text-gray-500 ml-2">Большое изображение</span>
                </label>
                <div className="flex gap-2">
                  <Input
                    type="file"
                    accept="image/*"
                    disabled={isUploading}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) uploadImage(file, 'carousel_image_url');
                    }}
                    className="flex-1"
                  />
                  {project.carousel_image_url && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeImage('carousel_image_url')}
                      className="text-red-600"
                    >
                      <Icon name="Trash2" size={16} />
                    </Button>
                  )}
                </div>
                {project.carousel_image_url && (
                  <div className="mt-2 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                    <img src={project.carousel_image_url} alt="Carousel" className="w-full h-48 object-cover" />
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="border border-gradient-start/30 rounded-lg p-4 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-800 dark:to-gray-900">
            <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
              <Icon name="Images" size={18} />
              Галерея проекта (до 5 изображений)
              <span className="text-xs text-gray-500 ml-2">
                {galleryImages.length}/5
              </span>
            </h4>
            
            <div className="space-y-3">
              <div className="flex gap-2">
                <Input
                  type="file"
                  accept="image/*"
                  disabled={isUploading || galleryImages.length >= 5}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) uploadGalleryImage(file);
                    e.target.value = '';
                  }}
                  className="flex-1"
                />
              </div>

              <div className="flex gap-2">
                <Input
                  value={newImageUrl}
                  onChange={(e) => setNewImageUrl(e.target.value)}
                  placeholder="Или вставьте URL изображения"
                  disabled={galleryImages.length >= 5}
                  onKeyDown={(e) => e.key === 'Enter' && addImageByUrl()}
                />
                <Button
                  type="button"
                  onClick={addImageByUrl}
                  disabled={!newImageUrl.trim() || galleryImages.length >= 5}
                  size="sm"
                >
                  <Icon name="Plus" size={16} />
                </Button>
              </div>

              {galleryImages.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-3">
                  {galleryImages.map((url, index) => (
                    <div key={index} className="relative group rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                      <img src={url} alt={`Gallery ${index + 1}`} className="w-full h-32 object-cover" />
                      <button
                        onClick={() => removeGalleryImage(index)}
                        className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Icon name="X" size={16} />
                      </button>
                      <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                        {index + 1}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-gray-100">
              URL сайта <span className="text-red-500">*</span>
            </label>
            <Input
              value={project.website_url}
              onChange={(e) =>
                onChange({ ...project, website_url: e.target.value })
              }
              placeholder="https://example.com"
            />
            {project.website_url && (
              <p className="text-xs text-gray-500 mt-1">
                💡 Будет использоваться для iframe-предпросмотра, если нет изображений
              </p>
            )}
          </div>
          
          <div className="border border-gradient-start/30 rounded-lg p-4 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-900">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Icon name="Eye" size={18} />
                Предпросмотр
              </h4>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={viewMode === 'desktop' ? 'default' : 'outline'}
                  onClick={() => setViewMode('desktop')}
                >
                  <Icon name="Monitor" size={16} className="mr-1" />
                  Desktop
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={viewMode === 'tablet' ? 'default' : 'outline'}
                  onClick={() => setViewMode('tablet')}
                >
                  <Icon name="Tablet" size={16} className="mr-1" />
                  Tablet
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={viewMode === 'mobile' ? 'default' : 'outline'}
                  onClick={() => setViewMode('mobile')}
                >
                  <Icon name="Smartphone" size={16} className="mr-1" />
                  Mobile
                </Button>
              </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 overflow-auto">
              {(project.carousel_image_url || project.preview_image_url || project.image_url) ? (
                <div style={getPreviewDimensions()} className="border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
                  <img 
                    src={project.carousel_image_url || project.image_url || project.preview_image_url}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : project.website_url ? (
                <div style={getPreviewDimensions()} className="border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
                  <iframe
                    src={project.website_url}
                    title="Website Preview"
                    className="w-full h-full"
                    sandbox="allow-scripts allow-same-origin"
                  />
                </div>
              ) : (
                <div className="flex items-center justify-center h-64 text-gray-400 dark:text-gray-500">
                  <div className="text-center">
                    <Icon name="ImageOff" size={48} className="mx-auto mb-2 opacity-50" />
                    <p>Загрузите изображение или укажите URL</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_active"
              checked={project.is_active}
              onChange={(e) =>
                onChange({ ...project, is_active: e.target.checked })
              }
              className="w-4 h-4"
            />
            <label htmlFor="is_active" className="text-sm text-gray-900 dark:text-gray-100">
              Показывать на сайте
            </label>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex gap-3 justify-end sticky bottom-0 bg-white dark:bg-gray-800">
          <Button variant="outline" onClick={onClose} disabled={isUploading}>
            Отмена
          </Button>
          <Button onClick={onSave} disabled={isUploading}>
            {isUploading ? (
              <>
                <Icon name="Loader2" size={16} className="mr-2 animate-spin" />
                Загрузка...
              </>
            ) : (
              'Сохранить'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
