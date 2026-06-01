"use client";
import { useState } from "react";
import { DemoNav } from "@/components/layout/DemoNav";
import { useData } from "@/contexts/DataContext";
import { useAuth } from "@/contexts/AuthContext";
import RouteGuard from "@/components/RouteGuard";
import { Settings, Building2, MapPin, Palette } from "lucide-react";

export default function SettingsPage() {
  const { user } = useAuth();
  const { settings, updateSettings, players, updatePlayer, showToast } = useData();
  const [orgName, setOrgName] = useState(settings.organization_name);
  const [locations, setLocations] = useState<string[]>([...settings.locations]);
  const [photoText, setPhotoText] = useState(settings.consent_photo_text || "");
  const [videoText, setVideoText] = useState(settings.consent_video_text || "");
  const [medicalText, setMedicalText] = useState(settings.consent_medical_text || "");

  const [newLoc, setNewLoc] = useState("");

  const canEdit = user?.role === "admin" || user?.role === "coach";

  const handleSave = () => {
    updateSettings({
      organization_name: orgName.trim(),
      locations: locations.map((l) => l.trim()).filter(Boolean),
      consent_photo_text: photoText.trim(),
      consent_video_text: videoText.trim(),
      consent_medical_text: medicalText.trim(),
    });
  };

  const addLocation = () => {
    if (!newLoc.trim()) return;
    setLocations((prev) => [...prev, newLoc.trim()]);
    setNewLoc("");
  };

  const removeLocation = (idx: number) => {
    setLocations((prev) => prev.filter((_, i) => i !== idx));
  };

  const toggleConsentForAll = (field: "photo_consent" | "video_consent" | "participation_consent", value: boolean) => {
    players.forEach((p) => {
      updatePlayer(p.id, { [field]: value });
    });
    showToast(`Updated ${field.replace("_", " ")} for all players`, "success");
  };

  return (
    <RouteGuard allowedRoles={["admin"]}>
    <div className="min-h-screen bg-slate-50">
      <DemoNav />
      <main className="p-4 md:p-6 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-slate-800 mb-6">Admin Settings</h1>

        <div className="space-y-4">
          {/* Organization */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <Building2 className="w-4 h-4 text-tennis-500" />
              <h2 className="text-sm font-semibold text-slate-700">Organization</h2>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Team Name</label>
                <input
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-tennis-400"
                />
              </div>
            </div>
          </div>

          {/* Locations */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="w-4 h-4 text-tennis-500" />
              <h2 className="text-sm font-semibold text-slate-700">Locations</h2>
            </div>
            <div className="space-y-2">
              {locations.map((loc, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    value={loc}
                    onChange={(e) => {
                      const next = [...locations];
                      next[idx] = e.target.value;
                      setLocations(next);
                    }}
                    className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-tennis-400"
                  />
                  <button
                    onClick={() => removeLocation(idx)}
                    className="text-xs text-red-600 hover:underline px-2"
                  >
                    Remove
                  </button>
                </div>
              ))}
              <div className="flex items-center gap-2">
                <input
                  value={newLoc}
                  onChange={(e) => setNewLoc(e.target.value)}
                  placeholder="New location name"
                  className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-tennis-400"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") addLocation();
                  }}
                />
                <button
                  onClick={addLocation}
                  className="px-3 py-2 bg-slate-100 text-slate-700 rounded-lg text-xs font-medium hover:bg-slate-200"
                >
                  Add Location
                </button>
              </div>
            </div>
          </div>

          {/* Privacy & Safety */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <Palette className="w-4 h-4 text-tennis-500" />
              <h2 className="text-sm font-semibold text-slate-700">Privacy & Safety</h2>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Photo Consent Text</label>
                <textarea
                  value={photoText}
                  onChange={(e) => setPhotoText(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-tennis-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Video Consent Text</label>
                <textarea
                  value={videoText}
                  onChange={(e) => setVideoText(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-tennis-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Medical Consent Text</label>
                <textarea
                  value={medicalText}
                  onChange={(e) => setMedicalText(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-tennis-400"
                />
              </div>
              {canEdit && (
                <div className="pt-2 border-t border-slate-50">
                  <p className="text-xs font-medium text-slate-600 mb-2">Batch Actions</p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => toggleConsentForAll("photo_consent", true)}
                      className="px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-lg text-xs text-slate-600 hover:bg-slate-100"
                    >
                      Grant all photo consent
                    </button>
                    <button
                      onClick={() => toggleConsentForAll("photo_consent", false)}
                      className="px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-lg text-xs text-slate-600 hover:bg-slate-100"
                    >
                      Revoke all photo consent
                    </button>
                    <button
                      onClick={() => toggleConsentForAll("video_consent", true)}
                      className="px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-lg text-xs text-slate-600 hover:bg-slate-100"
                    >
                      Grant all video consent
                    </button>
                    <button
                      onClick={() => toggleConsentForAll("participation_consent", true)}
                      className="px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-lg text-xs text-slate-600 hover:bg-slate-100"
                    >
                      Grant all participation consent
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end">
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-tennis-600 text-white rounded-lg text-sm font-medium hover:bg-tennis-700"
            >
              Save Settings
            </button>
          </div>
        </div>
      </main>
    </div>
    </RouteGuard>
  );
}
