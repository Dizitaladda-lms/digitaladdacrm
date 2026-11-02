import { BellRing, KeyRound, Moon, Save, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import PushNotificationSettings from "../../components/notifications/PushNotificationSettings";
import "./Settings.css";

const Toggle = ({label, text, enabled = true}) => <label className="user-setting"><div><strong>{label}</strong><p>{text}</p></div><input type="checkbox" defaultChecked={enabled}/><span className="toggle-slider"/></label>;
const Settings = () => {
  const navigate = useNavigate();
  return (
    <section className="user-settings-page">
      <header>
        <p>Preferences</p>
        <h1>Settings</h1>
        <span>Manage your notifications, display and account security.</span>
      </header>
      <div className="user-settings-grid">
        <article>
          <h2><BellRing size={19} /> Notifications</h2>
          <Toggle label="Follow-up reminders" text="Receive reminders before a follow-up is due." />
          <Toggle label="Overdue alerts" text="Get notified when a lead activity is overdue." />
          <Toggle label="Daily agenda" text="Receive a summary of your planned activities." enabled={false} />
        </article>
        <article>
          <h2><Moon size={19} /> Workspace</h2>
          <Toggle label="Compact lead table" text="Show more leads in each table view." enabled={false} />
          <Toggle label="Browser notifications" text="Allow in-browser task reminders." />
          <Toggle label="Weekly performance summary" text="See your lead and follow-up progress every Monday." />
        </article>
        <article className="security-settings">
          <h2><ShieldCheck size={19} /> Security</h2>
          <p>Your name and password are securely managed from your profile.</p>
          <button type="button" onClick={() => navigate("/employee/profile")}>
            <KeyRound size={17} /> Manage profile & password
          </button>
        </article>
      </div>
      <PushNotificationSettings />
      <button className="save-settings" type="button" disabled title="Settings API will be connected later">
        <Save size={17} /> Save preferences
      </button>
    </section>
  );
};
export default Settings;
