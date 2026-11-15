
import express from "express";
import multer from "multer";
import path from "path";
import crypto from "crypto";
import fs from "fs";
import auth from "../middleware/auth.js";
import Document from "../models/Document.js";
import User from "../models/User.js";
import { sendUploadEmail } from "../utils/emailService.js";
import { checkExpiringDocuments } from "../utils/expiryReminder.js";
import PushSubscription from "../models/PushSubscription.js";
import { sendPushNotification } from "../utils/pushNotifications.js";

const router = express.Router();

const uploadDir = path.resolve("uploads");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

router.get("/", auth, async (req, res) => {
  try {
    const documents = await Document.find({ user: req.userId }).sort({
      createdAt: -1
    });

    res.json(documents);
  } catch (err) {
    res.status(500).json({ message: "Unable to fetch documents." });
  }
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
  cb(null, uploadDir);
},
  filename: (req, file, cb) => {
    const uniqueName = crypto.randomUUID() + path.extname(file.originalname);
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["application/pdf", "image/jpeg", "image/png"];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF, JPG and PNG files are allowed."));
    }
  }
});

// Upload document with automatic file verification
router.post("/upload", auth, upload.single("document"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        message: "Please select a document."
      });
    }

    const fileBuffer = fs.readFileSync(req.file.path);

    let isValid = false;

    if (req.file.mimetype === "application/pdf") {
      isValid = fileBuffer.subarray(0, 5).toString() === "%PDF-";
    } else if (req.file.mimetype === "image/jpeg") {
      isValid =
        fileBuffer[0] === 0xff &&
        fileBuffer[1] === 0xd8 &&
        fileBuffer[2] === 0xff;
    } else if (req.file.mimetype === "image/png") {
      isValid = fileBuffer.subarray(0, 8).equals(
        Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
      );
    }

    const newDocument = new Document({
      user: req.userId,
      originalName: req.file.originalname,
      storedName: req.file.filename,
      mimeType: req.file.mimetype,
      size: req.file.size,
      category: req.body.category || "Other",
      expiryDate: req.body.expiryDate
        ? new Date(`${req.body.expiryDate}T00:00:00`)
        : null,
      filePath: req.file.path,

      verificationStatus: isValid ? "Verified" : "Needs Review",

      verificationMessage: isValid
        ? "File format and signature checks passed. Authenticity is not confirmed."
        : "File signature does not match the selected format.",

      verifiedAt: isValid ? new Date() : null
    });

    await newDocument.save();
    await checkExpiringDocuments();
    const user = await User.findById(req.userId);

    if (user && user.email) {
    await sendUploadEmail(
      user.email,
      newDocument.originalName
    );
  }

    // Send phone push notification after document upload
try {
  const subscriptions = await PushSubscription.find({
    user: req.userId
  });

  const payload = {
    title: "DocuSafe",
    body: `${newDocument.originalName} uploaded successfully!`,
    url: "/"
  };

  for (const item of subscriptions) {
    await sendPushNotification(
      item.subscription,
      payload
    );
  }

  console.log(
    "Upload push notification sent to",
    subscriptions.length,
    "device(s)"
  );
} catch (error) {
  console.error("Upload push notification failed:", error.message);
}
    res.status(201).json({
      message: "Document uploaded successfully.",
      document: newDocument
    });

  } catch (err) {
    if (req.file) {
  fs.unlink(req.file.path, (error) => {
    if (error && error.code !== "ENOENT") {
      console.error("File cleanup failed:", error.message);
    }
  });
}

    console.error("Upload error:", err);

    res.status(500).json({
      message: "Document upload failed."
    });
  }
});

// Download document
router.get("/:id/download", auth, async (req, res) => {
  try {
    const document = await Document.findOne({
      _id: req.params.id,
      user: req.userId
    });

    if (!document) {
      return res.status(404).json({
        message: "Document not found."
      });
    }

    if (!fs.existsSync(document.filePath)) {
      return res.status(404).json({
        message: "File not found on server."
      });
    }

    res.download(document.filePath, document.originalName);
  } catch (err) {
    res.status(500).json({
      message: "Unable to download document."
    });
  }
});

// Delete document
router.delete("/:id", auth, async (req, res) => {
  try {
    const document = await Document.findOne({
      _id: req.params.id,
      user: req.userId
    });

    if (!document) {
      return res.status(404).json({
        message: "Document not found."
      });
    }

    if (fs.existsSync(document.filePath)) {
      fs.unlinkSync(document.filePath);
    }

    await Document.findByIdAndDelete(document._id);

    res.json({
      message: "Document deleted successfully."
    });
  } catch (err) {
    res.status(500).json({
      message: "Unable to delete document."
    });
  }
});

// Update document
router.put("/:id", auth, async (req, res) => {
  try {
    const { displayName, expiryDate, category } = req.body;

    const document = await Document.findOne({
      _id: req.params.id,
      user: req.userId
    });

    if (!document) {
      return res.status(404).json({
        message: "Document not found."
      });
    }

    if (displayName !== undefined) {
      if (typeof displayName !== "string" || !displayName.trim()) {
        return res.status(400).json({
          message: "Document name cannot be empty."
        });
      }

      document.displayName = displayName.trim();
    }

    if (expiryDate !== undefined) {
      if (expiryDate === null || expiryDate === "") {
        document.expiryDate = null;
        document.verificationStatus = "Needs Review";
        document.verificationMessage = "Expiry date is not provided.";
        document.verifiedAt = null;
      } else {
        const parsedDate = new Date(expiryDate);

        if (Number.isNaN(parsedDate.getTime())) {
          return res.status(400).json({
            message: "Invalid expiry date."
          });
        }

        document.expiryDate = parsedDate;

        if (parsedDate < new Date()) {
          document.verificationStatus = "Expired";
          document.verificationMessage = "This document has expired.";
        } else {
          document.verificationStatus = "Verified";
          document.verificationMessage =
            "File format checks passed. Authenticity is not confirmed.";
        }

        document.verifiedAt = new Date();
      }
    }

    if (category !== undefined) {
      if (typeof category !== "string" || !category.trim()) {
        return res.status(400).json({
          message: "Category cannot be empty."
        });
      }

      document.category = category.trim();
    }

    await document.save();
    await checkExpiringDocuments();

    res.json({
      message: "Document updated successfully.",
      document
    });
  } catch (err) {
    res.status(500).json({
      message: "Unable to update document."
    });
  }
});

export default router;
