
import { useRef, useState, useEffect } from "react";
import "../App.css";
import NotificationSettings from "../NotificationSettings";

const API_URL = `${import.meta.env.VITE_API_URL}/api/documents`;

const categories = [
  "Other",
  "Identity",
  "Education",
  "Medical",
  "Finance",
  "Legal",
  "Custom"
];

const getToday = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatDate = (date) => {
  if (!date) return "No expiry date";

  return new Date(
    `${date.slice(0, 10)}T00:00:00`
  ).toLocaleDateString();
};

export default function Dashboard() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [expiryDate, setExpiryDate] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [editingDocument, setEditingDocument] = useState(null);

  const fileInput = useRef(null);
  const token = localStorage.getItem("token");

  const showMessage = (text, type = "success") => {
    setMessage(text);
    setMessageType(type);
  };

  const fetchDocuments = async () => {
    try {
      const response = await fetch(API_URL, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.status === 401) {
        localStorage.removeItem("token");
        window.location.href = "/";
        return;
      }

      if (!response.ok) {
        throw new Error("Unable to load documents.");
      }

      const data = await response.json();
      setDocuments(data);
    } catch (error) {
      showMessage(error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) {
      window.location.href = "/";
      return;
    }

    fetchDocuments();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    window.location.href = "/";
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      showMessage("Please select a document first.", "warning");
      return;
    }

    const formData = new FormData();
    formData.append("document", selectedFile);
    formData.append("category", "Other");

    if (expiryDate) {
      formData.append("expiryDate", expiryDate);
    }

    try {
      setUploading(true);
      setMessage("");
      setMessageType("");

      const response = await fetch(`${API_URL}/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Upload failed.");
      }

      setSelectedFile(null);
      setExpiryDate("");

      if (fileInput.current) {
        fileInput.current.value = "";
      }

      showMessage("Your document was uploaded successfully!", "success");
      await fetchDocuments();
    } catch (error) {
      showMessage(error.message, "error");
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (id, name) => {
    try {
      const response = await fetch(`${API_URL}/${id}/download`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error("Unable to download document.");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = name;
      link.click();

      window.URL.revokeObjectURL(url);

      showMessage("Document downloaded successfully!", "success");
    } catch (error) {
      showMessage(error.message, "error");
    }
  };

  const handleEdit = (doc) => {
    const isCustomCategory = !categories.includes(doc.category);

    setEditingDocument({
      ...doc,
      displayName: doc.displayName || doc.originalName,
      category: isCustomCategory ? "Custom" : doc.category,
      customCategory: isCustomCategory ? doc.category : "",
      expiryDate: doc.expiryDate
        ? doc.expiryDate.slice(0, 10)
        : ""
    });

    setMessage("");
    setMessageType("");
  };

  const handleUpdate = async () => {
    if (!editingDocument) return;

    const finalCategory =
      editingDocument.category === "Custom"
        ? editingDocument.customCategory.trim()
        : editingDocument.category;

    if (!editingDocument.displayName.trim()) {
      showMessage("Document name cannot be empty.", "warning");
      return;
    }

    if (!finalCategory) {
      showMessage("Please enter your custom category.", "warning");
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/${editingDocument._id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            displayName: editingDocument.displayName.trim(),
            expiryDate: editingDocument.expiryDate || "",
            category: finalCategory
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to update document.");
      }

      setDocuments((prev) =>
        prev.map((doc) =>
          doc._id === editingDocument._id
            ? data.document
            : doc
        )
      );

      setEditingDocument(null);
      showMessage("Document details updated successfully!", "success");
    } catch (error) {
      showMessage(error.message, "error");
    }
  };

  const handleDelete = async (id) => {
    if (
      !window.confirm(
        "Are you sure you want to permanently delete this document?"
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Delete failed.");
      }

      setDocuments((prev) =>
        prev.filter((doc) => doc._id !== id)
      );

      showMessage("Document deleted successfully.", "success");
    } catch (error) {
      showMessage(error.message, "error");
    }
  };

  const today = getToday();

  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 30);

  const lastExpiringDate = `${futureDate.getFullYear()}-${String(
    futureDate.getMonth() + 1
  ).padStart(2, "0")}-${String(
    futureDate.getDate()
  ).padStart(2, "0")}`;

  const expiredDocuments = documents.filter((doc) => {
    if (!doc.expiryDate) return false;
    return doc.expiryDate.slice(0, 10) < today;
  });

  const expiringDocuments = documents.filter((doc) => {
    if (!doc.expiryDate) return false;

    const expiry = doc.expiryDate.slice(0, 10);
    return expiry >= today && expiry <= lastExpiringDate;
  });

  const filteredDocuments = documents.filter((doc) => {
    const documentName = (
      doc.displayName || doc.originalName
    ).toLowerCase();

    const originalName = doc.originalName.toLowerCase();
    const searchText = search.toLowerCase();

    return (
      documentName.includes(searchText) ||
      originalName.includes(searchText)
    );
  });

  return (
    <div className="dashboard">
      <aside className="sidebar">
        <h2 className="brand">🔐 DocuSafe</h2>
        <p className="side-label">WORKSPACE</p>

        <a href="#overview" className="nav-link active">
          ▦ Overview
        </a>

        <a href="#documents" className="nav-link">
          📁 My Documents
        </a>

        <a href="#expiry" className="nav-link">
          ⏰ Expiry Tracker
        </a>

        <a href="#activity" className="nav-link">
          📊 Activity
        </a>

        <div className="sidebar-bottom">
          <div className="profile">
            <div className="avatar">S</div>
            <div>
              <strong>My Account</strong>
              <small>Personal Vault</small>
            </div>
          </div>

          <button className="logout-btn" onClick={handleLogout}>
            ↪ Logout
          </button>
        </div>
      </aside>

      <main className="main-content" id="overview">
        <header className="topbar">
          <div>
            <h2>Dashboard</h2>
            <p>Manage and secure all your important documents.</p>
          </div>

          <div className="topbar-right">
            <span className="secure-label">🛡️ Secure Vault</span>
            <div className="avatar">S</div>
          </div>
        </header>

        <section className="welcome">
          <div>
            <h1>Welcome to DocuSafe! 👋</h1>
            <p>Your documents, organized and protected in one place.</p>
          </div>

          <button
            className="upload-btn"
            onClick={() => fileInput.current.click()}
          >
            + Select Document
          </button>

          <input
            ref={fileInput}
            type="file"
            hidden
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={(e) => {
              setSelectedFile(e.target.files[0] || null);
              setExpiryDate("");
              setMessage("");
              setMessageType("");
            }}
          />
        </section>

        {selectedFile && (
          <div className="selected-file">
            <div>
              <strong>📄 {selectedFile.name}</strong>
              <small>
                <br />
                {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
              </small>
            </div>

            <div className="expiry-input">
              <label>Document Expiry Date (Optional)</label>
              <input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
              />
            </div>

            <div>
              <button
                onClick={handleUpload}
                disabled={uploading}
              >
                {uploading ? "Uploading..." : "Upload Now"}
              </button>

              {!uploading && (
                <button
                  onClick={() => {
                    setSelectedFile(null);
                    setExpiryDate("");
                    fileInput.current.value = "";
                  }}
                >
                  Cancel
                </button>
              )}
            </div>

            {uploading && (
              <div className="upload-progress">
                <div className="upload-progress-bar"></div>
              </div>
            )}
          </div>
        )}

        {message && (
          <div className={`${messageType}-message`}>
            {messageType === "success" && "✓ "}
            {messageType === "error" && "✕ "}
            {messageType === "warning" && "⚠️ "}
            {message}
          </div>
        )}

        {expiredDocuments.length > 0 && (
          <div className="warning-message">
            ⚠️ Attention! You have {expiredDocuments.length} expired
            document(s). Please review them.
          </div>
        )}

        {expiringDocuments.length > 0 && (
          <div className="warning-message">
            ⏰ Warning! {expiringDocuments.length} document(s)
            will expire within 30 days. Please renew them in time.
          </div>
        )}

        <NotificationSettings />

        <section className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon blue">📁</div>
            <p>Total Documents</p>
            <h2>{documents.length}</h2>
            <small>Uploaded documents</small>
          </div>

          <div className="stat-card">
            <div className="stat-icon green">✓</div>
            <p>Verified Documents</p>
            <h2>
              {documents.filter(
                (doc) => doc.verificationStatus === "Verified"
              ).length}
            </h2>
            <small>Passed file checks</small>
          </div>

          <div className="stat-card">
            <div className="stat-icon orange">⏰</div>
            <p>Expiring Soon</p>
            <h2>{expiringDocuments.length}</h2>
            <small>Expiring within 30 days</small>
          </div>

          <div className="stat-card">
            <div className="stat-icon red">!</div>
            <p>Expired Documents</p>
            <h2>{expiredDocuments.length}</h2>
            <small>Past expiry date</small>
          </div>
        </section>

        <section className="content-grid">
          <div className="panel documents-panel" id="documents">
            <div className="panel-heading">
              <div>
                <h3>My Documents</h3>
                <p>Your uploaded documents</p>
              </div>

              <input
                className="search-input"
                type="text"
                placeholder="Search documents..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="document-list">
              {loading && (
                <p className="empty-message">Loading documents...</p>
              )}

              {!loading &&
                filteredDocuments.map((doc) => (
                  <div className="document-row" key={doc._id}>
                    <div className="document-info">
                      <strong>
                        📄 {doc.displayName || doc.originalName}
                      </strong>

                      <small>
                        {doc.category} · Uploaded:{" "}
                        {new Date(doc.createdAt).toLocaleDateString()}
                      </small>

                      <small>
                        Expiry: {formatDate(doc.expiryDate)}
                      </small>

                      <small>
                        Verification:{" "}
                        <span
                          className={
                            doc.verificationStatus === "Verified"
                              ? "verified-status"
                              : doc.verificationStatus === "Expired"
                              ? "expired-status"
                              : "review-status"
                          }
                        >
                          {doc.verificationStatus || "Needs Review"}
                        </span>
                      </small>

                      {doc.verificationMessage && (
                        <small>{doc.verificationMessage}</small>
                      )}
                    </div>

                    <button
                      onClick={() =>
                        handleDownload(doc._id, doc.originalName)
                      }
                    >
                      Download
                    </button>

                    <button onClick={() => handleEdit(doc)}>
                      Edit
                    </button>

                    <button onClick={() => handleDelete(doc._id)}>
                      Delete
                    </button>
                  </div>
                ))}

              {!loading && filteredDocuments.length === 0 && (
                <p className="empty-message">
                  No documents found.
                </p>
              )}
            </div>

            {editingDocument && (
              <div className="panel">
                <h3>✏️ Edit Document Details</h3>

                <label>Document Name</label>
                <input
                  type="text"
                  value={editingDocument.displayName}
                  onChange={(e) =>
                    setEditingDocument({
                      ...editingDocument,
                      displayName: e.target.value
                    })
                  }
                />

                <label>Choose Category</label>
                <select
                  value={editingDocument.category}
                  onChange={(e) =>
                    setEditingDocument({
                      ...editingDocument,
                      category: e.target.value
                    })
                  }
                >
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>

                {editingDocument.category === "Custom" && (
                  <>
                    <label>Enter Your Own Category</label>
                    <input
                      type="text"
                      placeholder="Example: College Certificates"
                      value={editingDocument.customCategory}
                      onChange={(e) =>
                        setEditingDocument({
                          ...editingDocument,
                          customCategory: e.target.value
                        })
                      }
                    />
                  </>
                )}

                <label>Expiry Date (Optional)</label>
                <input
                  type="date"
                  value={editingDocument.expiryDate || ""}
                  onChange={(e) =>
                    setEditingDocument({
                      ...editingDocument,
                      expiryDate: e.target.value
                    })
                  }
                />

                <button onClick={handleUpdate}>
                  Save Changes
                </button>

                <button
                  onClick={() => setEditingDocument(null)}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          <div className="panel expiry-panel" id="expiry">
            <div className="panel-heading">
              <div>
                <h3>Expiry Reminder</h3>
                <p>Documents that need attention</p>
              </div>
              <span className="reminder-icon">🔔</span>
            </div>

            {expiredDocuments.length === 0 &&
              expiringDocuments.length === 0 && (
                <p>No expiry reminders available.</p>
              )}

            {expiredDocuments.map((doc) => (
              <div className="activity-item" key={doc._id}>
                <span>⚠️</span>
                <div>
                  <strong>
                    {doc.displayName || doc.originalName}
                  </strong>
                  <small>
                    Expired on {formatDate(doc.expiryDate)}
                  </small>
                </div>
              </div>
            ))}

            {expiringDocuments.map((doc) => (
              <div className="activity-item" key={doc._id}>
                <span>⏰</span>
                <div>
                  <strong>
                    {doc.displayName || doc.originalName}
                  </strong>
                  <small>
                    Expires on {formatDate(doc.expiryDate)}
                  </small>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="panel activity-panel" id="activity">
          <h3>Recent Activity</h3>
          <p>Keep track of your vault activity.</p>

          <div className="activity-item">
            <span>📤</span>
            <div>
              <strong>Document vault opened</strong>
              <small>Your DocuSafe dashboard is ready.</small>
            </div>
            <small>Today</small>
          </div>
        </section>
      </main>
    </div>
  );
}
