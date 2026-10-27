"use server";

export type NoteValidationResult = {
  valid: boolean;
  cleanedTags: string[];
  title?: string;
  body?: string;
  errors: {
    title?: string;
    body?: string;
  };
};

export async function checkNote(input: { title: string; body: string; tags: string[] }): Promise<NoteValidationResult> {
  const title = input.title.trim();
  const body = input.body.trim();
  const cleanedTags = Array.from(
    new Set((input.tags ?? []).map((tag) => tag.trim().toLowerCase()).filter(Boolean)),
  );

  const errors: { title?: string; body?: string } = {};

  if (!title) {
    errors.title = "Please add a title before saving.";
  }

  if (!body) {
    errors.body = "Please add note content before saving.";
  }

  return {
    valid: Object.keys(errors).length === 0,
    cleanedTags,
    title,
    body,
    errors,
  };
}
