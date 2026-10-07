import { useEffect, useRef, useState } from "react";
import { Camera, X } from "lucide-react";
import toast from "react-hot-toast";

const STEPS = [
  { title: "Look straight at the camera", prompt: "Keep your face centered and capture." },
  { title: "Turn your head", prompt: (turn) => `Move toward the ${turn} arrow shown below.` },
  { title: "Look straight again", prompt: "Return to the center and capture." },
];

const AttendanceFaceCapture = ({ turn, onComplete, onCancel }) => {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState(0);
  const framesRef = useRef([]);

  useEffect(() => {
    let active = true;
    const startCamera = async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error("This browser does not support camera access.");
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        });
        if (!active) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          if (active) setCameraReady(true);
        }
      } catch (error) {
        toast.error(error.message || "Camera access failed. Allow camera permission and try again.");
        onCancel();
      }
    };
    startCamera();

    return () => {
      active = false;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, [onCancel]);

  const capture = () => {
    const video = videoRef.current;
    if (!video || video.readyState < 2 || !video.videoWidth || !video.videoHeight) {
      toast.error("Camera is not ready yet. Please wait and try again.");
      return;
    }
    const scale = Math.min(1, 640 / Math.max(video.videoWidth, video.videoHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    const context = canvas.getContext("2d");
    if (!context) {
      toast.error("Could not capture the camera frame. Please try again.");
      return;
    }
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    framesRef.current = [...framesRef.current, canvas.toDataURL("image/jpeg", 0.72)];

    if (step === STEPS.length - 1) {
      setSubmitting(true);
      onComplete(framesRef.current);
      return;
    }
    setStep((currentStep) => currentStep + 1);
  };

  const currentStep = STEPS[step];
  const displayTurn = turn === "LEFT" ? "RIGHT" : "LEFT";
  const prompt = typeof currentStep.prompt === "function"
    ? currentStep.prompt(displayTurn)
    : currentStep.prompt;

  return (
    <div className="bio-camera-modal-overlay" role="presentation">
      <section
        className="bio-camera-modal attendance-face-capture"
        role="dialog"
        aria-modal="true"
        aria-labelledby="attendance-face-capture-title"
      >
        <header className="bio-camera-modal-header">
          <div className="bio-camera-modal-title">
            <Camera size={18} />
            <h3 id="attendance-face-capture-title">Live face verification</h3>
          </div>
          <button type="button" onClick={onCancel} aria-label="Cancel face verification">
            <X size={20} />
          </button>
        </header>
        <p className="attendance-face-capture-step">Step {step + 1} of {STEPS.length}</p>
        <p className="attendance-face-capture-prompt">{prompt}</p>
        {step === 1 && (
          <div className="attendance-face-capture-direction" role="img" aria-label={`Move toward screen ${displayTurn.toLowerCase()}`}>
            <span aria-hidden="true">{displayTurn === "LEFT" ? "←" : "→"}</span>
            <strong>{displayTurn} SIDE</strong>
          </div>
        )}
        <video ref={videoRef} autoPlay playsInline muted className="attendance-face-capture-video" />
        <p className="attendance-face-capture-note">
          Keep only your face in the frame. Captured frames are checked on the attendance server and are not saved as photos.
        </p>
        <div className="attendance-face-capture-actions">
          <button type="button" className="btn-bio-secondary" onClick={onCancel}>Cancel</button>
          <button
            type="button"
            className="btn-bio-primary"
            onClick={capture}
            disabled={!cameraReady || submitting}
          >
            <Camera size={16} /> Capture step
          </button>
        </div>
      </section>
    </div>
  );
};

export default AttendanceFaceCapture;
