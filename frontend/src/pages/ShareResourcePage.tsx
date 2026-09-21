import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { resourceApi, aiApi } from '../api';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles, Upload, CheckCircle, Loader2, AlertCircle
} from 'lucide-react';

export default function ShareResourcePage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<'describe' | 'classify' | 'details' | 'done'>('describe');
  const [description, setDescription] = useState('');
  const [classification, setClassification] = useState<any>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: '',
    description: '',
    category_id: '',
    resource_type: '',
    condition: 'good',
    quantity: 1,
    location: '',
    building: '',
    mode: 'borrow',
    price: '',
    tags: '',
    available_from: '',
    available_until: ''
  });

  const { data: catData } = useQuery({
    queryKey: ['resource-categories-share'],
    queryFn: async () => {
      try {
        const res = await resourceApi.categories();
        return res.data?.categories || [];
      } catch {
        return [];
      }
    }
  });

  const categories: Array<{ id: string; name: string; slug: string }> = catData || [];

  const classifyMut = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      if (description) formData.append('text', description);
      if (imageFile) formData.append('image', imageFile);
      return aiApi.classifyResource(formData).then((r) => r.data);
    },
    onSuccess: (data) => {
      const cls = data.classification || {};
      setClassification(cls);

      // Find matching category ID
      const matchedCat = categories.find(
        (c) =>
          c.slug?.toLowerCase() === cls.category?.toLowerCase() ||
          c.name?.toLowerCase() === cls.category?.toLowerCase()
      );

      setForm((f) => ({
        ...f,
        title: cls.title || f.title || '',
        description: description || f.description || '',
        category_id: matchedCat?.id || '',
        resource_type: cls.resource_type || ''
      }));
      setStep('classify');
    },
    onError: () => {
      toast.error('AI classification was unable to process. You can proceed manually.');
      setForm((f) => ({ ...f, description: description }));
      setStep('details');
    }
  });

  const submitMut = useMutation({
    mutationFn: async () => {
      const data = new FormData();
      const body = {
        title: form.title,
        description: form.description,
        category_id: form.category_id || undefined,
        resource_type: form.resource_type || undefined,
        condition: form.condition,
        quantity: Number(form.quantity) || 1,
        location: form.location || undefined,
        building: form.building || undefined,
        mode: form.mode,
        price: form.price ? parseFloat(form.price) : null,
        tags: form.tags ? form.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
        available_from: form.available_from || null,
        available_until: form.available_until || null,
      };
      data.append('data', JSON.stringify(body));
      if (imageFile) data.append('images', imageFile);
      return resourceApi.create(data).then((r) => r.data);
    },
    onSuccess: () => {
      toast.success('Resource listed successfully!');
      setStep('done');
    },
    onError: (err: any) =>
      toast.error(err.response?.data?.error || 'Failed to create listing')
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (ev) => setImagePreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleManualEntry = () => {
    setForm((f) => ({ ...f, description: description }));
    setStep('details');
  };

  return (
    <div className="p-6 max-w-3xl mx-auto animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-ink mb-1">Share a Campus Resource</h1>
        <p className="text-ink-muted text-sm">
          List idle equipment, books, components, or tools for your campus community.
        </p>
      </div>

      {/* Steps indicator */}
      <div className="flex items-center gap-2 mb-8">
        {[
          { id: 'describe', label: 'Describe' },
          { id: 'classify', label: 'AI Review' },
          { id: 'details', label: 'Details' }
        ].map((s, i) => {
          const stepOrder = ['describe', 'classify', 'details', 'done'];
          const currentIndex = stepOrder.indexOf(step);
          const thisIndex = stepOrder.indexOf(s.id);
          const isPassed = currentIndex > thisIndex;
          const isCurrent = step === s.id;

          return (
            <div key={s.id} className="flex items-center gap-2">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                  isCurrent
                    ? 'bg-emerald-700 text-white'
                    : isPassed
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-surface-alt text-ink-subtle border border-border'
                }`}
              >
                {isPassed ? '✓' : i + 1}
              </div>
              <span
                className={`text-xs font-semibold ${
                  isCurrent ? 'text-ink' : 'text-ink-subtle'
                }`}
              >
                {s.label}
              </span>
              {i < 2 && <div className="w-8 h-px bg-border mx-1" />}
            </div>
          );
        })}
      </div>

      {/* Step 1: Describe & Upload */}
      {step === 'describe' && (
        <div className="bg-surface-card border border-border rounded-2xl p-6 sm:p-8 space-y-6 shadow-sm">
          <div>
            <label className="block text-xs font-bold text-ink uppercase tracking-wider mb-2">
              What do you want to share?
            </label>
            <textarea
              className="w-full px-4 py-3 bg-surface border border-border rounded-xl text-sm text-ink placeholder:text-ink-subtle focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 resize-none h-32"
              placeholder="e.g. ESP32 NodeMCU development board with Wi-Fi & Bluetooth, good condition with USB cable, used for IoT course project..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <p className="text-xs text-ink-subtle mt-1.5">
              Include key specs, model numbers, or any included accessories.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-ink uppercase tracking-wider mb-2">
              Photo (Optional)
            </label>
            <label className="border-2 border-dashed border-border hover:border-emerald-500 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer bg-surface hover:bg-surface-alt transition-colors group">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageChange}
              />
              {imagePreview ? (
                <div className="flex flex-col items-center gap-2">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-32 h-32 object-cover rounded-xl border border-border shadow-sm"
                  />
                  <span className="text-xs text-emerald-700 font-medium">Click to change photo</span>
                </div>
              ) : (
                <div className="text-center">
                  <Upload size={28} className="mx-auto text-ink-subtle group-hover:text-emerald-700 mb-2 transition-colors" />
                  <span className="text-sm font-semibold text-ink block">Upload an image</span>
                  <span className="text-xs text-ink-subtle">PNG, JPG, WEBP up to 5MB</span>
                </div>
              )}
            </label>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={() => classifyMut.mutate()}
              disabled={classifyMut.isPending || (!description.trim() && !imageFile)}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm disabled:opacity-60 flex-1"
            >
              {classifyMut.isPending ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>AI Analyzing Item...</span>
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  <span>Classify with AI</span>
                </>
              )}
            </button>
            <button
              onClick={handleManualEntry}
              className="px-5 py-3 border border-border bg-white hover:bg-surface-alt text-ink text-sm font-medium rounded-xl transition-colors"
            >
              Skip AI / Manual Entry
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Classify Review or Step 3: Details Form */}
      {(step === 'classify' || step === 'details') && (
        <div className="space-y-6 animate-fade-in">
          {classification && (
            <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 bg-emerald-600 text-white rounded-full flex items-center justify-center">
                  <Sparkles size={12} />
                </div>
                <span className="font-bold text-emerald-900 text-sm">AI Classification Suggestions</span>
                {classification.confidence && (
                  <span className="text-xs font-semibold text-emerald-700 ml-auto">
                    {Math.round(classification.confidence * 100)}% confidence
                  </span>
                )}
              </div>

              {classification.warning && (
                <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-xl text-amber-800 text-xs mb-3 border border-amber-200">
                  <AlertCircle size={14} className="flex-shrink-0 mt-0.5 text-amber-600" />
                  <span>{classification.warning}</span>
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                {[
                  { label: 'Category', value: classification.category },
                  { label: 'Type', value: classification.resource_type },
                  { label: 'Brand', value: classification.brand || '—' },
                  { label: 'Model', value: classification.model || '—' },
                ].map((item) => (
                  <div key={item.label} className="bg-white/80 border border-emerald-200/60 rounded-xl p-2.5">
                    <div className="text-emerald-700 text-[11px] font-semibold">{item.label}</div>
                    <div className="text-emerald-950 font-bold capitalize mt-0.5 truncate">{item.value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Details Form */}
          <div className="bg-surface-card border border-border rounded-2xl p-6 sm:p-8 space-y-5 shadow-sm">
            <h2 className="text-lg font-bold text-ink">Listing Details</h2>

            <div>
              <label className="block text-xs font-bold text-ink uppercase tracking-wider mb-2">
                Title *
              </label>
              <input
                type="text"
                className="w-full px-3.5 py-2.5 bg-surface border border-border rounded-xl text-sm text-ink focus:outline-none focus:border-emerald-600"
                placeholder="Item name (e.g. Arduino Uno Rev3)"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-ink uppercase tracking-wider mb-2">
                Description *
              </label>
              <textarea
                className="w-full px-3.5 py-2.5 bg-surface border border-border rounded-xl text-sm text-ink focus:outline-none focus:border-emerald-600 resize-none h-24"
                placeholder="Describe condition, specifications, and what comes with it..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-ink uppercase tracking-wider mb-2">
                  Category
                </label>
                <select
                  value={form.category_id}
                  onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-surface border border-border rounded-xl text-sm text-ink focus:outline-none focus:border-emerald-600"
                >
                  <option value="">Select a category...</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-ink uppercase tracking-wider mb-2">
                  Condition
                </label>
                <select
                  value={form.condition}
                  onChange={(e) => setForm({ ...form, condition: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-surface border border-border rounded-xl text-sm text-ink focus:outline-none focus:border-emerald-600 capitalize"
                >
                  {['excellent', 'good', 'fair', 'poor'].map((c) => (
                    <option key={c} value={c} className="capitalize">{c}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-ink uppercase tracking-wider mb-2">
                  Sharing Mode
                </label>
                <select
                  value={form.mode}
                  onChange={(e) => setForm({ ...form, mode: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-surface border border-border rounded-xl text-sm text-ink focus:outline-none focus:border-emerald-600"
                >
                  {[
                    { v: 'borrow', l: 'Borrow (Temporary loan)' },
                    { v: 'give', l: 'Free Give (Permanent gift)' },
                    { v: 'exchange', l: 'Exchange (Barter)' },
                    { v: 'low_cost_sale', l: 'Low-cost Sale' }
                  ].map((m) => (
                    <option key={m.v} value={m.v}>{m.l}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-ink uppercase tracking-wider mb-2">
                  Available Quantity
                </label>
                <input
                  type="number"
                  min={1}
                  className="w-full px-3.5 py-2.5 bg-surface border border-border rounded-xl text-sm text-ink focus:outline-none focus:border-emerald-600"
                  value={form.quantity}
                  onChange={(e) => setForm({ ...form, quantity: parseInt(e.target.value) || 1 })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-ink uppercase tracking-wider mb-2">
                  Campus Building
                </label>
                <input
                  type="text"
                  placeholder="e.g. Science Block A"
                  className="w-full px-3.5 py-2.5 bg-surface border border-border rounded-xl text-sm text-ink focus:outline-none focus:border-emerald-600"
                  value={form.building}
                  onChange={(e) => setForm({ ...form, building: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-ink uppercase tracking-wider mb-2">
                  Room / Specific Location
                </label>
                <input
                  type="text"
                  placeholder="e.g. Room 204, Robotics Lab"
                  className="w-full px-3.5 py-2.5 bg-surface border border-border rounded-xl text-sm text-ink focus:outline-none focus:border-emerald-600"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-ink uppercase tracking-wider mb-2">
                Tags (comma-separated)
              </label>
              <input
                type="text"
                placeholder="e.g. esp32, iot, microcontroller, sensors"
                className="w-full px-3.5 py-2.5 bg-surface border border-border rounded-xl text-sm text-ink focus:outline-none focus:border-emerald-600"
                value={form.tags}
                onChange={(e) => setForm({ ...form, tags: e.target.value })}
              />
            </div>

            <div className="flex gap-3 pt-4 border-t border-border">
              <button
                onClick={() => submitMut.mutate()}
                disabled={submitMut.isPending || !form.title.trim() || !form.description.trim()}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm disabled:opacity-60 flex-1"
              >
                {submitMut.isPending ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Publishing Listing...</span>
                  </>
                ) : (
                  <span>Publish Listing</span>
                )}
              </button>
              <button
                onClick={() => setStep('describe')}
                className="px-5 py-3 border border-border bg-white hover:bg-surface-alt text-ink text-sm font-medium rounded-xl transition-colors"
              >
                Back
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Done State */}
      {step === 'done' && (
        <div className="bg-surface-card border border-border rounded-2xl p-8 sm:p-12 text-center max-w-lg mx-auto shadow-sm animate-fade-in">
          <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={32} />
          </div>
          <h2 className="text-xl font-bold text-ink mb-2">Resource Listed Successfully!</h2>
          <p className="text-ink-muted text-sm mb-8 leading-relaxed">
            Your item is now indexed in the campus catalogue. Other students and departments can discover and request it.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-3">
            <button
              onClick={() => navigate('/app/resources')}
              className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
            >
              View in My Resources
            </button>
            <button
              onClick={() => {
                setStep('describe');
                setDescription('');
                setClassification(null);
                setImageFile(null);
                setImagePreview(null);
                setForm({
                  title: '', description: '', category_id: '', resource_type: '',
                  condition: 'good', quantity: 1, location: '', building: '',
                  mode: 'borrow', price: '', tags: '',
                  available_from: '', available_until: ''
                });
              }}
              className="px-5 py-2.5 border border-border bg-white hover:bg-surface-alt text-ink text-sm font-medium rounded-xl transition-colors"
            >
              Share Another Item
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
