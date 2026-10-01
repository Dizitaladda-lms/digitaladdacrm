import { useEffect, useRef, useState } from "react";
import { Camera, ChevronDown, LogOut, Pencil, UserRound } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";
import "./ProfileMenu.css";

const initialsFor = (name) => (name || "User")
  .split(" ")
  .map((part) => part[0])
  .join("")
  .slice(0, 2)
  .toUpperCase();

const ProfileMenu = ({ compact = false }) => {
  const { user, logout, updateProfile } = useAuth();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [desig, setDesig] = useState("");
  const [photo, setPhoto] = useState("");
  const [saving, setSaving] = useState(false);
  const menuRef = useRef(null);

  const displayName = user?.full_name || user?.name || "User";
  const role = user?.role || "User";
  const photoUrl = user?.profile_image;

  useEffect(() => {
    const closeMenu = (event) => {
      if (!menuRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("mousedown", closeMenu);
    return () => document.removeEventListener("mousedown", closeMenu);
  }, []);

  const openEditor = () => {
    setName(displayName);
    setDesig(user?.designation || "");
    setPhoto(photoUrl || "");
    setEditing(true);
    setOpen(false);
  };

  const handlePhoto = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > 1500000) {
      toast.error("Choose a PNG, JPEG, or WebP image smaller than 1.5 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setPhoto(reader.result);
    reader.readAsDataURL(file);
  };

  const saveProfile = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await updateProfile({ full_name: name, designation: desig, profile_image: photo });
      toast.success("Profile updated.");
      setEditing(false);
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not update profile.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`profile-menu ${compact ? "profile-menu-compact" : ""}`} ref={menuRef}>
      <button type="button" className="profile-menu-trigger" onClick={() => setOpen((value) => !value)} aria-expanded={open}>
        <div className="profile-menu-avatar">
          {photoUrl ? <img src={photoUrl} alt="Profile" /> : initialsFor(displayName)}
        </div>
        {!compact && <div className="profile-menu-details"><strong>{displayName}</strong><span>{user?.designation || role}</span></div>}
        <ChevronDown size={17} />
      </button>

      {open && <div className="profile-menu-dropdown">
        <div className="profile-menu-summary">
          <div className="profile-menu-avatar">{photoUrl ? <img src={photoUrl} alt="Profile" /> : initialsFor(displayName)}</div>
          <div><strong>{displayName}</strong><span>{user?.designation ? `${user.designation} • ` : ""}{user?.email}</span></div>
        </div>
        <button type="button" onClick={openEditor}><Pencil size={16} /> Edit profile</button>
        <button type="button" className="profile-menu-signout" onClick={logout}><LogOut size={16} /> Sign out</button>
      </div>}

      {editing && <div className="profile-editor-backdrop" role="presentation" onMouseDown={() => !saving && setEditing(false)}>
        <form className="profile-editor" onSubmit={saveProfile} onMouseDown={(event) => event.stopPropagation()}>
          <div className="profile-editor-heading"><UserRound size={20} /><div><h2>Edit profile</h2><p>Update the name, designation, and photo shown in your portal.</p></div></div>
          <label className="profile-photo-picker">
            <div className="profile-photo-preview">{photo ? <img src={photo} alt="Selected profile" /> : initialsFor(name)}</div>
            <span><Camera size={16} /> Choose photo</span>
            <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handlePhoto} />
          </label>
          {photo && <button type="button" className="profile-remove-photo" onClick={() => setPhoto("")}>Remove photo</button>}
          <label className="profile-name-field">Display name<input value={name} onChange={(event) => setName(event.target.value)} minLength="3" maxLength="100" required /></label>
          <label className="profile-name-field" style={{ marginTop: "8px" }}>Designation<input value={desig} onChange={(event) => setDesig(event.target.value)} maxLength="100" placeholder="e.g. Full Stack Developer" /></label>
          <div className="profile-editor-actions"><button type="button" onClick={() => setEditing(false)} disabled={saving}>Cancel</button><button type="submit" disabled={saving}>{saving ? "Saving…" : "Save changes"}</button></div>
        </form>
      </div>}
    </div>
  );
};

export default ProfileMenu;
