import { Spinner, useToast } from "@chakra-ui/react";
import { Editor, IAllProps } from "@tinymce/tinymce-react";
import axios from "axios";
import React, { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import type { Editor as TinyMCEEditor } from "tinymce";
import { styled } from "twin.macro";
import { IEvent } from "models/Event";
import { IOrg } from "models/Org";
import { useAppDispatch } from "store";
import { incrementRTEditorIndex, selectRTEditorIndex } from "store/uiSlice";
import { Session } from "utils/auth";

interface BlobInfo {
  id: () => string;
  name: () => string;
  filename: () => string;
  blob: () => Blob;
  base64: () => string;
  blobUri: () => string;
  uri: () => string | undefined;
}

interface UploadFailureOptions {
  remove?: boolean;
}

const bindEvent = (
  target: Document | Element,
  eventName: string,
  fun: () => void
) => {
  if (target.addEventListener) {
    target.removeEventListener(eventName, fun, false);
    target.addEventListener(eventName, fun, false);
  }
};

const RTEditorStyles = styled("div")((props) => {
  return ``;
});

export const RTEditor = ({
  defaultValue,
  event,
  org,
  placeholder,
  readOnly,
  session,
  value,
  onBlur,
  onChange,
  ...props
}: {
  defaultValue?: string;
  event?: IEvent;
  org?: IOrg;
  placeholder?: string;
  readOnly?: boolean;
  session?: Session | null;
  height?: string;
  width?: string;
  value?: string;
  onBlur?: (html: string) => void;
  onChange?: ({ html }: { html: string }) => void;
}) => {
  const dispatch = useAppDispatch();
  const toast = useToast({ position: "top" });
  const [isLoading, setIsLoading] = useState(true);
  const [isTouched, setIsTouched] = useState(false);

  //#region tinymce
  const editorRef = useRef<TinyMCEEditor | null>(null);
  const closeToolbar = () => {
    if (editorRef.current) {
      if (editorRef.current.queryCommandState("ToggleToolbarDrawer")) {
        try {
          editorRef.current.execCommand("ToggleToolbarDrawer");
        } catch (error) {
          console.error(error);
        }
      }
    }
  };
  const init: IAllProps["init"] = {
    //#region styling
    branding: false,
    content_css: "default",
    content_style: `
    body { 
      font-family:Helvetica,Arial,sans-serif;
      font-size:14px;
      overflow-y: scroll;
    }
    p { margin: 0; padding: 0; }
    `,
    height: props.height || undefined,
    placeholder,
    //endregion
    language: "fr_FR",
    language_url: "/tinymce/langs/fr_FR.js",
    max_height: 500,
    menubar: false,
    mobile: {
      toolbar_location: "bottom",
      toolbar_mode: "floating"
    },
    // plugins: [
    //   "advlist autolink lists link image charmap print preview anchor",
    //   "searchreplace visualblocks code fullscreen",
    //   "insertdatetime media table paste code help wordcount",
    //   "image media"
    // ],
    plugins: [
      "autolink code",
      "emoticons charmap fullscreen",
      "image link media paste searchreplace",
      "help"
    ],
    //contextmenu: "copy paste link",
    contextmenu: false,
    statusbar: false,
    toolbar:
      "fullscreen undo redo \
             emoticons | formatselect | \
            alignleft aligncenter bold italic charmap \
            | link unlink | image media \
            | removeformat | code help",
    file_picker_types: "image",
    file_picker_callback: (
      cb: Function,
      value: any,
      meta: Record<string, any>
    ) => {
      const input = document.createElement("input");
      input.setAttribute("type", "file");
      input.setAttribute("accept", "image/*");
      input.onchange = () => {
        //@ts-expect-error
        const file = this.files[0];
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result !== "string") return;
          const id = "blobid" + new Date().getTime();
          const blobCache = editorRef.current!.editorUpload.blobCache;
          const base64 = reader.result.split(",")[1];
          const blobInfo = blobCache.create(id, file, base64);
          blobCache.add(blobInfo);
          cb(blobInfo.blobUri(), { title: file.name });
        };
        reader.readAsDataURL(file);
      };

      input.click();
    },
    image_upload_handler: async (
      blobInfo: BlobInfo,
      success: (url: string) => void,
      failure: (err: string, options?: UploadFailureOptions) => void,
      progress?: (percent: number) => void
    ) => {
      let formData = new FormData();
      const file = blobInfo.blob();

      if (file.size >= 10000000) {
        toast({
          status: "error",
          title: "L'image ne doit pas dépasser 10Mo."
        });
        return;
      }

      formData.append("files[]", file, blobInfo.filename());
      if (event) formData.append("eventId", event._id);
      else if (org) formData.append("orgId", org._id);
      else if (session) formData.append("userId", session.user.userId);

      try {
        const mutation = await axios.post(
          process.env.NEXT_PUBLIC_API2,
          formData
        );
        if (mutation.status !== 200) {
          failure("Erreur dans la sauvegarde des images", {
            remove: true
          });
          return;
        }
        if (typeof mutation.data.file !== "string") {
          failure("Réponse invalide", { remove: true });
          return;
        }

        let url = `${process.env.NEXT_PUBLIC_API2}/view?fileName=${mutation.data.file}`;
        if (event) url += `&eventId=${event._id}`;
        else if (org) url += `&orgId=${org._id}`;
        else if (session) url += `&userId=${session.user.userId}`;

        success(url);
      } catch (error) {
        console.error(error);
        failure("Erreur dans la sauvegarde des images", {
          remove: true
        });
      }
    }
  };
  //#endregion

  //#region componentDidMount
  const currentIndex = useSelector(selectRTEditorIndex);
  const [shortId, setShortId] = useState<string | undefined>();
  useEffect(() => {
    dispatch(incrementRTEditorIndex());
    setShortId(`rteditor-${currentIndex + 1}`);
    //   if (editorRef.current) {
    //     console.log(editorRef.current.getContent());
    //   }
  }, []);
  //#endregion

  return (
    <RTEditorStyles>
      {isLoading && (
        <div
          style={{
            position: "relative"
          }}
        >
          <Spinner />
        </div>
      )}

      {shortId && (
        <Editor
          disabled={readOnly}
          id={shortId}
          init={init}
          initialValue={isTouched ? undefined : defaultValue}
          tinymceScriptSrc="/tinymce/tinymce.min.js"
          value={value}
          onBlur={(e, editor) => {
            closeToolbar();
            onBlur && onBlur(editor.getContent());
          }}
          onEditorChange={(html, editor) => {
            if (html !== defaultValue) {
              setIsTouched(true);
              onChange && onChange({ html });
            }
          }}
          onInit={(evt, editor) => {
            setIsLoading(false);
            editorRef.current = editor;
            const target = editor.contentDocument.documentElement;

            if (target) {
              bindEvent(target, "click", () => {
                closeToolbar();
              });
            }
          }}
        />
      )}
    </RTEditorStyles>
  );
};
