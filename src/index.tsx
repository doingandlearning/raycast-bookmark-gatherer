import { Form, ActionPanel, Action, showToast, Clipboard, getPreferenceValues, closeMainWindow, popToRoot } from "@raycast/api";
import { useEffect, useState, useRef } from "react";
import axios from "axios"
import { load } from "cheerio";
import fs from "node:fs"
import path from "node:path"

type Values = {
  url: string;
  title: string;
  description: string;
  tags: string[];
  customTags?: string
};

export default function Command() {
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [customTags, setCustomTags] = useState(""); // State for custom tags input

  const descriptionRef = useRef(null); // Ref for the description field


  const fetchTitle = async (url: string) => {
    try {
      const { data } = await axios.get(url);
      const $ = load(data);
      const title = $('head title').text();
      setTitle(title);
    } catch (error) {
      showToast({ title: "Error", message: "Could not fetch the website title" });
    }
  };

  // Effect to autofill the URL from the clipboard
  useEffect(() => {
    Clipboard.readText().then((clipboardText) => {
      if (clipboardText && clipboardText.startsWith("http")) {
        setUrl(clipboardText);
        fetchTitle(clipboardText);
      }
      setIsLoading(false);
    });
  }, []);

  useEffect(() => {
    if (url) {
      fetchTitle(url);
    }
  }, [url]);

  useEffect(() => {
    if (!isLoading) {
      (descriptionRef.current)?.focus();
    }
  }, [isLoading]);

  function handleSubmit(values: Values) {
    if (!values.url) {
      return
    }
    try {

      const tagsArray = values.customTags!.split(/,|\s+/).filter(tag => tag.trim() !== "")
      delete values.customTags;
      saveDataToFile({ ...values, tags: tagsArray, date: new Date() });
      popToRoot()
      closeMainWindow({ clearRootSearch: true });
    } catch (error) {
      console.log(error)
      showToast({ title: 'Error', message: 'Something went wrong' });
    }
  }

  function saveDataToFile(data) {
    const preferences = getPreferenceValues();
    const saveDirectory = preferences.saveDirectory || process.env.HOME; // Fallback to home directory

    const filePath = path.join(saveDirectory, 'raycast-bookmarks.json'); // Save file in home directory
    fs.readFile(filePath, (err, fileData) => {
      let bookmarks = [];
      if (!err) {
        bookmarks = JSON.parse(fileData.toString());
      }
      bookmarks.push(data);
      fs.writeFile(filePath, JSON.stringify(bookmarks, null, 2), (writeErr) => {
        if (writeErr) {
          showToast({ title: 'Error', message: 'Failed to save data' });
        }
      });
    });
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
      initialFocus="description"
    >
      <Form.Description text="Bookmark Gatherer" />
      <Form.TextField id="url" title="URL" placeholder="URL" value={url} onChange={setUrl} />
      <Form.TextField id="title" title="Title" placeholder="Title" value={title} onChange={setTitle} />
      <Form.TextArea id="description" title="Description" placeholder="What did you find compelling or intriguing about this?" ref={descriptionRef} />
      <Form.TextField
        id="customTags"
        title="Custom Tags"
        placeholder="Enter custom tags separated by comma or space"
        value={customTags}
        onChange={setCustomTags}
      />
    </Form>
  );
}
