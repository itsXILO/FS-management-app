import { CLOUDINARY_CLOUD_NAME, CLOUDINARY_UPLOAD_PRESET } from "@/constants";
import { Trash, UploadCloud } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "./ui/button";

type UploadWidgetValue = {
  url: string;
  publicId: string;
};

type UploadWidgetProps = {
  value?: UploadWidgetValue | null;
  onChange?: (value: UploadWidgetValue | null) => void;
  disabled?: boolean;
};

type CloudinaryWidget = {
  open: () => void;
};

type CloudinaryUploadWidgetResults = {
  event: string;
  info: {
    secure_url: string;
    public_id: string;
    delete_token?: string;
  };
};

type CloudinaryWindow = Window & {
  cloudinary?: {
    createUploadWidget: (
      options: Record<string, unknown>,
      callback: (error: unknown, result: CloudinaryUploadWidgetResults) => void,
    ) => CloudinaryWidget;
  };
};

function UploadWidget({
  value = null,
  onChange,
  disabled = false,
}: UploadWidgetProps) {
  const widgetRef = useRef<CloudinaryWidget | null>(null);
  const onChangeRef = useRef(onChange);

  const [preview, setPreview] = useState<UploadWidgetValue | null>(value);
  const [deleteToken, setDeleteToken] = useState<string | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const [isWidgetReady, setIsWidgetReady] = useState(false);

  // Always keep latest onChange
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Sync external value → internal preview
  useEffect(() => {
    setPreview(value);
    if (!value) {
      setDeleteToken(null);
    }
  }, [value]);

  // Initialize Cloudinary widget (client-side only)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const cloudinaryWindow = window as CloudinaryWindow;

    const scriptId = "cloudinary-upload-widget";
    const existingScript = document.getElementById(scriptId) as HTMLScriptElement | null;

    const initializeWidget = () => {
      if (!cloudinaryWindow.cloudinary || widgetRef.current) return false;

      widgetRef.current = cloudinaryWindow.cloudinary.createUploadWidget(
        {
          cloudName: CLOUDINARY_CLOUD_NAME,
          uploadPreset: CLOUDINARY_UPLOAD_PRESET,
          multiple: false,
          folder: "uploads",
          maxFileSize: 5_000_000,
          clientAllowedFormats: ["png", "jpg", "jpeg"],
        },
        (error: unknown, result: CloudinaryUploadWidgetResults) => {
          if (!error && result.event === "success") {
            const payload: UploadWidgetValue = {
              url: result.info.secure_url,
              publicId: result.info.public_id,
            };

            setPreview(payload);
            setDeleteToken(result.info.delete_token ?? null);
            onChangeRef.current?.(payload);
          }
        }
      );

      setIsWidgetReady(true);

      return true;
    };

    if (initializeWidget()) return;

    const script =
      existingScript ??
      Object.assign(document.createElement("script"), {
        id: scriptId,
        src: "https://upload-widget.cloudinary.com/latest/global/all.js",
        async: true,
      });

    if (!existingScript) {
      document.body.appendChild(script);
    }

    const intervalId = window.setInterval(() => {
      if (initializeWidget()) {
        window.clearInterval(intervalId);
      }
    }, 500);

    return () => window.clearInterval(intervalId);
  }, []);

  const openWidget = () => {
    if (!disabled) {
      widgetRef.current?.open();
    }
  };

  const removeFromCloudinary = async () => {
    if (!preview) return;

    setIsRemoving(true);

    try {
      if (deleteToken) {
        const params = new URLSearchParams();
        params.append("token", deleteToken);

        await fetch(
          `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/delete_by_token`,
          {
            method: "POST",
            body: params,
          }
        );
      }
    } catch (error) {
      console.error("Failed to remove image from Cloudinary", error);
    } finally {
      setPreview(null);
      setDeleteToken(null);
      onChangeRef.current?.(null);
      setIsRemoving(false);
    }
  };

  return (
    <div className="space-y-2">
      {preview ? (
        <div className="upload-preview">
          <img src={preview.url} alt="Uploaded file" />

          <Button
            type="button"
            size="icon"
            variant="destructive"
            onClick={removeFromCloudinary}
            disabled={isRemoving || disabled}
          >
            <Trash className="size-4" />
          </Button>
        </div>
      ) : (
        <div
          className="upload-dropzone"
          role="button"
          tabIndex={0}
          onClick={openWidget}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              openWidget();
            }
          }}
        >
          <div className="upload-prompt">
            <UploadCloud className="icon" />
            <div>
              <p>Click to upload photo</p>
              <p>PNG, JPG up to 5MB</p>
              {!isWidgetReady ? (
                <p className="text-xs text-muted-foreground mt-1">
                  Initializing Cloudinary widget...
                </p>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default UploadWidget;