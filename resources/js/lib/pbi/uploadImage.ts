import axios from 'axios';

/** Uploads an image for a builder page and returns its public URL. */
export async function uploadPageImage(
    pageId: number,
    file: File,
): Promise<string> {
    const form = new FormData();
    form.append('image', file);
    const { data } = await axios.post<{ url: string }>(
        `/api/builder-pages/${pageId}/images`,
        form,
    );
    return data.url;
}
