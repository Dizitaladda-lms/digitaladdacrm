import { useEffect, useState } from "react";
import { X } from "lucide-react";

const initialForm = {
  full_name: "",
  mobile: "",
  email: "",
  course_name: "",
  domain: "",
  status: "NEW",
  priority: "MEDIUM",
  remarks: "",
};

const EditLeadModal = ({
  open = false,
  lead = null,
  onClose,
  onSubmit,
}) => {

  const [formData, setFormData] = useState(initialForm);

  useEffect(() => {

    if (lead) {

      setFormData({

        full_name: lead.full_name || "",

        mobile: lead.mobile || "",

        email: lead.email || "",

        course_name: lead.course_name || "",

        domain: lead.domain || "",

        status: lead.status || "NEW",

        priority: lead.priority || "MEDIUM",

        remarks: lead.remarks || "",

      });

    }

  }, [lead]);

  const handleChange = (e) => {

    const { name, value } = e.target;

    setFormData((prev) => ({

      ...prev,

      [name]: value,

    }));

  };

  const handleSubmit = (e) => {

    e.preventDefault();

    onSubmit?.(formData);

  };

  if (!open) return null;

  return (

    <>

      {/* Backdrop */}

      <div

        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"

        onClick={onClose}

      />

      {/* Modal */}

      <div className="fixed inset-0 z-50 flex items-center justify-center p-6">

        <div className="w-full max-w-3xl rounded-2xl bg-white shadow-2xl">

          {/* Header */}

          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">

            <div>

              <h2 className="text-xl font-bold text-slate-800">

                Edit Lead

              </h2>

              <p className="text-sm text-slate-500">

                Update lead information.

              </p>

            </div>

            <button

              onClick={onClose}

              className="rounded-lg p-2 hover:bg-slate-100"

            >

              <X size={22} />

            </button>

          </div>

          {/* Form */}

          <form onSubmit={handleSubmit}>

            <div className="grid grid-cols-1 gap-5 p-6 md:grid-cols-2">

              <div>

                <label className="mb-2 block text-sm font-medium">

                  Full Name

                </label>

                <input

                  type="text"

                  name="full_name"

                  value={formData.full_name}

                  onChange={handleChange}

                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-600"

                />

              </div>

              <div>

                <label className="mb-2 block text-sm font-medium">

                  Mobile

                </label>

                <input

                  type="text"

                  name="mobile"

                  value={formData.mobile}

                  onChange={handleChange}

                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-600"

                />

              </div>

              <div>

                <label className="mb-2 block text-sm font-medium">

                  Email

                </label>

                <input

                  type="text"

                  name="email"

                  value={formData.email}

                  onChange={handleChange}

                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-600"

                />

              </div>

              <div>

                <label className="mb-2 block text-sm font-medium">

                  Course

                </label>

                <input

                  type="text"

                  name="course_name"

                  value={formData.course_name}

                  onChange={handleChange}

                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-600"

                />

              </div>

              <div>

                <label className="mb-2 block text-sm font-medium">

                  Domain / Brand

                </label>

                <select

                  name="domain"

                  value={formData.domain}

                  onChange={handleChange}

                  className="w-full rounded-xl border border-slate-300 px-4 py-3"

                >

                  <option value="">Select Domain</option>

                  <option value="DizitalAdda">DizitalAdda</option>

                  <option value="Nidads">Nidads</option>

                  <option value="Nigape">Nigape</option>

                  <option value="Nihacs">Nihacs</option>

                  <option value="HackingVidya">HackingVidya</option>

                  <option value="IIDAD">IIDAD</option>

                  <option value="Nifase">Nifase</option>

                  <option value="DesigningVidya">DesigningVidya</option>

                  <option value="LanguageVidya">LanguageVidya</option>

                </select>

              </div>

              <div>

                <label className="mb-2 block text-sm font-medium">

                  Status

                </label>

                <select

                  name="status"

                  value={formData.status}

                  onChange={handleChange}

                  className="w-full rounded-xl border border-slate-300 px-4 py-3"

                >

                  <option value="NEW">New</option>

                  <option value="CONTACTED">Contacted</option>

                  <option value="FOLLOW_UP">Follow Up</option>

                  <option value="QUALIFIED">Qualified</option>

                  <option value="ADMISSION">Admission</option>

                  <option value="LOST">Lost</option>

                </select>

              </div>

              <div>

                <label className="mb-2 block text-sm font-medium">

                  Priority

                </label>

                <select

                  name="priority"

                  value={formData.priority}

                  onChange={handleChange}

                  className="w-full rounded-xl border border-slate-300 px-4 py-3"

                >

                  <option value="HIGH">High</option>

                  <option value="MEDIUM">Medium</option>

                  <option value="LOW">Low</option>

                </select>

              </div>

              <div className="md:col-span-2">

                <label className="mb-2 block text-sm font-medium">

                  Remarks

                </label>

                <textarea

                  rows={4}

                  name="remarks"

                  value={formData.remarks}

                  onChange={handleChange}

                  className="w-full rounded-xl border border-slate-300 px-4 py-3"

                />

              </div>

            </div>

            {/* Footer */}

            <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-5">

              <button

                type="button"

                onClick={onClose}

                className="rounded-xl border border-slate-300 px-6 py-3"

              >

                Cancel

              </button>

              <button

                type="submit"

                className="rounded-xl bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-700"

              >

                Update Lead

              </button>

            </div>

          </form>

        </div>

      </div>

    </>

  );

};

export default EditLeadModal;