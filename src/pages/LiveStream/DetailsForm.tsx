import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ChangeEvent, Fragment, useEffect, useState } from 'react';
import { Label } from '@/components/ui/label';
import RequiredInput from '@/components/RequiredInput';
import FormErrorMessage from '@/components/FormErrorMsg';
import { Textarea } from '@/components/ui/textarea';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Blocks, Camera, Check, Copy, Pencil, Radio, Save } from 'lucide-react';
import ImageUpload from '@/components/ImageUpload';
import { Separator } from '@/components/ui/separator';
import { DialogClose } from '@radix-ui/react-dialog';
import { saveVideoOrStream, StreamInitializeError } from '@/services/stream';
import { STREAM_TYPE } from '@/data/types/stream';
import AppAlert from '@/components/AppAlert';
import { useSidebar } from '@/components/CustomSidebar';
import { StreamDetailsResponse } from '@/data/dto/stream';
import { MultiSelect } from '@/components/MultiSelect';
import { MAX_CATEGORY_COUNT, StreamDetailsRules } from '@/data/validations';
import { FORM_MODE } from '@/data/types/ui/form';
import AuthImage from '@/components/AuthImage';
import VideoCategory from '@/components/VideoCategory';
import { cn, convertToHashtagStyle } from '@/lib/utils';
import { fetchImageWithAuth } from '@/api/image';
import TooltipComponent from '@/components/TooltipComponent';
import { useCopyToClipboard } from '@/hooks/useCopyToClipboard';
import { toast } from 'sonner';

interface ComponentProps {
  type: STREAM_TYPE;
  isOpen: boolean;
  mode: FORM_MODE;
  data?: StreamDetailsResponse;
  categories: { id: string; name: string }[];
  onSuccess: (data: StreamDetailsResponse) => void;
  onClose: () => void;
}

const inputPlaceholders = {
  title: 'Add a title that describes your stream',
  description: 'Tell viewers more about your stream',
  category: `Select up to ${MAX_CATEGORY_COUNT} categories`,
};

const validationRules = {
  title: 'Title is required, max 100 characters',
  description: 'Description is required',
  thumbnail: 'Thumbnail is required, max 1 MB size',
  category: 'Category is required',
  common: 'Something went wrong. Please try again.',
};

type StreamInitializeFormError = {
  titleFailure: boolean;
  descriptionFailure: boolean;
  categoryFailure: boolean;
  thumbnailImageFailure: boolean;
  actionFailure: boolean;
};

const DetailsForm = (props: ComponentProps) => {
  const { open: isSidebarOpen, setOpen: setSidebarOpen } = useSidebar();

  const {
    type: streamType,
    isOpen,
    mode = FORM_MODE.CREATE,
    data,
    categories,
    onSuccess,
    onClose,
  } = props;

  const [streamServer, streamKey] = getStreamCrendentials(data?.push_url || '');

  const [_mode, setMode] = useState<FORM_MODE>(mode);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [title, setTitle] = useState(data?.title || '');
  const [description, setDescription] = useState(data?.description || '');
  const [thumbnailImage, setThumbnailImage] = useState<{
    file: null | File;
    preview: null | string;
  }>({
    file: null,
    preview: null,
  });
  const [formError, setFormError] = useState<StreamInitializeFormError>({
    titleFailure: false,
    descriptionFailure: false,
    categoryFailure: false,
    thumbnailImageFailure: false,
    actionFailure: false,
  });

  const isViewMode = _mode === FORM_MODE.VIEW;
  const isCreateMode = mode === FORM_MODE.CREATE;
  const isEditMode = _mode === FORM_MODE.EDIT;

  const [isStreamServerCopied, setIsStreamServerCopied] = useState(false);
  const [isStreamKeyCopied, setIsStreamKeyCopied] = useState(false);
  const [copiedText, copy, isCopied] = useCopyToClipboard();

  /**
   *
   * @param mode
   * // mode -> create -> start initializing stream (create)
   * // mode -> edit -> update stream details (update)
   */
  const handleStreamDetailsSave = async (mode: FORM_MODE): Promise<void> => {
    setIsLoading(true);

    let responseData: StreamDetailsResponse | undefined,
      responseErrors: Record<StreamInitializeError, boolean> | undefined;

    if (mode === FORM_MODE.CREATE) {
      const { data: _data, errors: _errors } = await saveVideoOrStream(
        {
          title,
          description,
          categories: selectedCategories,
          streamType,
          thumbnailImage: thumbnailImage?.file,
          thumbnailPreview: thumbnailImage?.preview,
        },
        FORM_MODE.CREATE
      );
      responseData = _data;
      responseErrors = _errors;
    } else if (mode === FORM_MODE.EDIT) {
      const { data: _data, errors: _errors } = await saveVideoOrStream(
        {
          id: data?.id || 0,
          title,
          description,
          categories: selectedCategories,
          streamType,
          thumbnailImage: thumbnailImage?.file,
          thumbnailPreview: thumbnailImage?.preview,
        },
        FORM_MODE.EDIT
      );
      responseData = _data;
      responseErrors = _errors;
    }

    if (!!responseData && !responseErrors) {
      onSuccess(responseData);
      setMode(FORM_MODE.VIEW);
      if (isSidebarOpen) setSidebarOpen(false);
    } else {
      if (responseErrors) {
        const formError: StreamInitializeFormError = {
          titleFailure:
            responseErrors?.[StreamInitializeError.INVALID_TITLE] || false,
          descriptionFailure:
            responseErrors?.[StreamInitializeError.INVALID_TITLE] || false,
          categoryFailure:
            responseErrors?.[StreamInitializeError.INVALID_CATEGORY] || false,
          thumbnailImageFailure:
            responseErrors?.[StreamInitializeError.INVALID_THUMBNAIL_IMAGE] ||
            false,
          actionFailure:
            responseErrors?.[StreamInitializeError.ACTION_FAILURE] || false,
        };

        const {
          titleFailure,
          descriptionFailure,
          categoryFailure,
          thumbnailImageFailure,
        } = formError;
        setFormError((prevError: StreamInitializeFormError) => ({
          ...prevError,
          titleFailure,
          descriptionFailure,
          categoryFailure,
          thumbnailImageFailure,
        }));
      }
    }
    setIsLoading(false);
  };

  const handleCancelEdit = () => {
    setMode(FORM_MODE.VIEW);
    clearFormErrors();
  };

  // input handlers
  const handleTitleChange = (e: ChangeEvent<HTMLInputElement>): void => {
    const value = e.target.value;

    if (value.length <= StreamDetailsRules.title.max) {
      setTitle(e.target.value);

      const error = {
        titleFailure: false,
        actionFailure: false,
      };

      setFormError((prevState: StreamInitializeFormError) => ({
        ...prevState,
        ...error,
      }));
    }
  };
  const handleDescriptionChange = (
    e: ChangeEvent<HTMLTextAreaElement>
  ): void => {
    const value = e.target.value;

    if (value.length <= StreamDetailsRules.description.max) {
      setDescription(e.target.value);

      const error = {
        descriptionFailure: false,
        actionFailure: false,
      };

      setFormError((prevState: StreamInitializeFormError) => ({
        ...prevState,
        ...error,
      }));
    }
  };
  const handleCategoryChange = (value: string[]): void => {
    setSelectedCategories(value);

    const error = {
      categoryFailure: false,
      actionFailure: false,
    };

    setFormError((prevState: StreamInitializeFormError) => ({
      ...prevState,
      ...error,
    }));
  };
  const handleImagesChange = (file: File | null) => {
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setThumbnailImage({ file, preview: reader.result as string });
      };
      reader.readAsDataURL(file);
      setFormError((prevError: StreamInitializeFormError) => ({
        ...prevError,
        actionFailure: false,
        thumbnailImageFailure: false,
      }));
    } else {
      setThumbnailImage({ file: null, preview: null });
      setFormError((prevError: StreamInitializeFormError) => ({
        ...prevError,
        thumbnailImageFailure: true,
      }));
    }
  };

  const handleClose = () => {
    setMode(FORM_MODE.VIEW);
    if (data) {
      setSelectedCategories(() =>
        (data?.category_ids || []).map((id: number) => id.toString())
      );
      setThumbnailImage({
        file: null,
        preview: data.thumbnail_url || null,
      });
    }
    onClose();
  };

  const clearFormErrors = () =>
    setFormError({
      actionFailure: false,
      titleFailure: false,
      descriptionFailure: false,
      categoryFailure: false,
      thumbnailImageFailure: false,
    });

  useEffect(() => {
    return function clean() {
      clearFormErrors();
    };
  }, []);

  useEffect(() => {
    if (isEditMode && data) {
      setThumbnailImage((prev) => {
        return prev.preview !== data?.thumbnail_url
          ? { ...prev, preview: data?.thumbnail_url }
          : prev;
      });
    }
    setSelectedCategories(() =>
      (data?.category_ids || []).map((id: number) => id.toString())
    );
  }, [isEditMode, data, categories]);

  useEffect(() => {
    if (data && isEditMode && data?.thumbnail_url) {
      const fetchOldThumbnail = async () => {
        if (data?.thumbnail_url) {
          const oldThumbnailUrl = await fetchImageWithAuth(data?.thumbnail_url);
          setThumbnailImage((prev) => {
            return { ...prev, preview: oldThumbnailUrl };
          });
        }
      };
      fetchOldThumbnail();
    }
  }, [data, isEditMode]);

  // reset the input values whenever _mode changes to VIEW
  useEffect(() => {
    if (_mode === FORM_MODE.VIEW && data) {
      setTitle(data.title || '');
      setDescription(data.description || '');
    }
  }, [_mode, data]);

  useEffect(() => {
    if (isCopied) {
      if (copiedText === streamServer) {
        setIsStreamServerCopied(true);
      } else if (copiedText === streamKey) {
        setIsStreamKeyCopied(true);
      }
    } else {
      setIsStreamServerCopied(false);
      setIsStreamKeyCopied(false);
    }
  }, [isCopied, copiedText, streamServer, streamKey]);

  const {
    actionFailure,
    titleFailure,
    descriptionFailure,
    categoryFailure,
    thumbnailImageFailure,
  } = formError;
  let invalidTitleError = null,
    invalidDescriptionError = null,
    invalidCategoryError = null,
    invalidThumbnailImageError = null,
    somethingWrongError = null;
  if (titleFailure) invalidTitleError = validationRules.title;
  if (descriptionFailure) invalidDescriptionError = validationRules.description;
  if (categoryFailure) invalidCategoryError = validationRules.category;
  if (thumbnailImageFailure)
    invalidThumbnailImageError = validationRules.thumbnail;
  if (actionFailure) {
    somethingWrongError = validationRules.common;
    invalidTitleError = '';
    invalidThumbnailImageError = '';
  }

  const titleInputInvalid = titleFailure || actionFailure;
  const descriptionInputInvalid = descriptionFailure || actionFailure;
  const categoryInputInvalid = categoryFailure || actionFailure;
  const thumbnailImageInputInvalid = thumbnailImageFailure || actionFailure;

  if ((_mode === FORM_MODE.VIEW || _mode === FORM_MODE.EDIT) && !data) return;

  let formDescription = '';
  let formTitle = '';
  switch (_mode) {
    case FORM_MODE.CREATE:
      formTitle = 'Create Stream';
      formDescription = 'Fill the following information to start streaming.';
      break;
    case FORM_MODE.EDIT:
      formTitle = 'Edit Stream';
      formDescription =
        'Update the following information as needed. All fields are required.';
      break;
    case FORM_MODE.VIEW:
      formTitle = 'About Stream';
      formDescription = 'Following information describes about your stream.';
      break;
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] p-0">
        <DialogHeader className="p-5 px-7 pb-0">
          <DialogTitle>{formTitle}</DialogTitle>
          <DialogDescription>{formDescription}</DialogDescription>
          {!isViewMode && categories?.length === 0 && (
            <AppAlert
              variant="destructive"
              title="Sorry. No category available. Can't stream at the moment."
            />
          )}
        </DialogHeader>
        <Separator />
        <div className="grid gap-1 p-5 px-7 pt-2">
          <div className="grid gap-3">
            {somethingWrongError && (
              <AppAlert
                variant="destructive"
                title="Error"
                description={validationRules.common}
              />
            )}

            {/* Streams server and key */}
            {mode === FORM_MODE.VIEW && data && data.push_url && (
              <>
                <Label>
                  Stream crendentials (paste them into your streaming software)
                </Label>
                <div className="w-full border rounded-md py-4 px-3 space-y-2">
                  <div className="border-b pb-2 text-xs relative">
                    <span className="italic text-muted-foreground">
                      Stream Server:
                    </span>{' '}
                    <span>{streamServer}</span>{' '}
                    <TooltipComponent
                      align="center"
                      text="Copy to Clipboard"
                      children={
                        <div
                          onClick={() => {
                            if (streamServer) {
                              copy(streamServer);
                              toast.success(
                                'Stream Server copied to clipboard!'
                              );
                            }
                          }}
                          className="absolute cursor-pointer hover:bg-muted p-2 right-0 -top-3 rounded-sm"
                        >
                          {isStreamServerCopied ? (
                            <Check className="w-4 h-4" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </div>
                      }
                    />
                  </div>
                  <div className="text-xs flex relative">
                    <span className="italic text-muted-foreground">
                      Stream Key:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                    </span>{' '}
                    <span>{streamKey}</span>{' '}
                    <TooltipComponent
                      align="center"
                      text="Copy to Clipboard"
                      children={
                        <div
                          onClick={() => {
                            if (streamKey) {
                              copy(streamKey);
                              toast.success('Stream Key copied to clipboard!');
                            }
                          }}
                          className="absolute cursor-pointer hover:bg-muted p-2 right-0 -bottom-3 rounded-sm"
                        >
                          {isStreamKeyCopied ? (
                            <Check className="w-4 h-4" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </div>
                      }
                    />
                  </div>
                </div>
              </>
            )}

            {/* title */}
            <div className="grid gap-3">
              <div className="flex justify-between items-center">
                <Label htmlFor="title">
                  Title {!isViewMode && <RequiredInput />}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {title?.length}/{StreamDetailsRules.title.max}
                </p>
              </div>
              <Input
                id="title"
                type="text"
                value={title}
                onChange={handleTitleChange}
                placeholder={inputPlaceholders.title}
                disabled={isLoading || isViewMode}
                className={cn(
                  'w-full',
                  titleInputInvalid && 'ring-red-500 border-red-500',
                  isViewMode && 'disabled:opacity-100'
                )}
              />
              {invalidTitleError && (
                <FormErrorMessage classes="-mt-2" message={invalidTitleError} />
              )}
            </div>

            {/* description */}
            <div className="grid gap-3 mt-1">
              <div className="flex justify-between items-center">
                <Label htmlFor="description">
                  Description {!isViewMode && <RequiredInput />}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {description?.length}/{StreamDetailsRules.description.max}
                </p>
              </div>
              <Textarea
                value={description}
                onChange={handleDescriptionChange}
                id="description"
                className={cn(
                  'w-full resize-none',
                  descriptionInputInvalid && 'ring-red-500 border-red-500',
                  isViewMode && 'disabled:opacity-100'
                )}
                rows={4}
                placeholder={inputPlaceholders.description}
                disabled={isLoading || isViewMode}
              />
              {invalidDescriptionError && (
                <FormErrorMessage
                  classes="-mt-2"
                  message={invalidDescriptionError}
                />
              )}
            </div>

            {/* categories */}
            <div className="grid gap-3 mt-1">
              <Label htmlFor="description">
                Categories {!isViewMode && <RequiredInput />}
              </Label>
              <div className="max-w-xl">
                {isViewMode ? (
                  <div className="flex gap-2 p-3 py-2 border rounded-md flex-wrap">
                    {data &&
                      data?.category_ids?.length > 0 &&
                      categories?.map((category, index) => {
                        if (data.category_ids?.includes(Number(category.id))) {
                          return (
                            <Fragment key={category.id}>
                              <VideoCategory
                                id={Number(category.id) || index}
                                label={convertToHashtagStyle(category.name)}
                              />
                            </Fragment>
                          );
                        }
                      })}
                  </div>
                ) : (
                  <MultiSelect
                    isError={categoryInputInvalid}
                    options={categories}
                    onValueChange={handleCategoryChange}
                    defaultValue={selectedCategories}
                    placeholder={inputPlaceholders.category}
                    animation={0}
                    maxCount={MAX_CATEGORY_COUNT}
                  />
                )}
              </div>
              {invalidCategoryError && (
                <FormErrorMessage
                  classes="-mt-2"
                  message={invalidCategoryError}
                />
              )}
            </div>

            <div className="flex flex-col-reverse md:flex-row w-full gap-5 justify-start items-start mt-1">
              {/* thumbnail image */}
              <div className="w-full md:w-1/2 grid gap-3">
                <Label htmlFor="description">
                  Thumbnail Image {!isViewMode && <RequiredInput />}
                </Label>
                {isViewMode ? (
                  <AuthImage
                    src={data?.thumbnail_url || ''}
                    alt={data?.title || 'Thumbnail'}
                    className="w-full h-24 rounded-sm object-cover"
                  />
                ) : (
                  <ImageUpload
                    isError={thumbnailImageInputInvalid}
                    isDisabled={isLoading || isViewMode}
                    width="w-full overflow-hidden"
                    height="h-24"
                    preview={thumbnailImage.preview || ''}
                    onFileChange={(file) => {
                      if (file) handleImagesChange(file);
                      else handleImagesChange(null);
                    }}
                  />
                )}
                {invalidThumbnailImageError && (
                  <FormErrorMessage
                    classes="-mt-2"
                    message={invalidThumbnailImageError}
                  />
                )}
              </div>

              {/* stream type */}
              <div className="w-full md:w-1/2 flex flex-col items-start gap-3">
                <Label htmlFor="title">
                  Stream Type {!isViewMode && <RequiredInput />}
                </Label>
                <div className="inline cursor-not-allowed">
                  <ToggleGroup type="single" value={streamType} disabled>
                    <ToggleGroupItem value={STREAM_TYPE.CAMERA}>
                      <Camera /> Webcam
                    </ToggleGroupItem>
                    <ToggleGroupItem value={STREAM_TYPE.SOFTWARE}>
                      <Blocks /> Software
                    </ToggleGroupItem>
                  </ToggleGroup>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="sm:flex gap-1 w-full px-0 pt-3">
            {!isEditMode && (
              <DialogClose asChild>
                <Button size="sm" variant="destructive" onClick={handleClose}>
                  {isViewMode ? 'Close' : 'Cancel'}
                </Button>
              </DialogClose>
            )}
            {isViewMode && (
              <Button size="sm" onClick={() => setMode(FORM_MODE.EDIT)}>
                <Pencil /> Edit
              </Button>
            )}
            {isCreateMode && (
              <Button
                disabled={categories?.length === 0}
                size="sm"
                onClick={() => handleStreamDetailsSave(FORM_MODE.CREATE)}
                className="bg-green-600 hover:bg-green-800"
              >
                <Radio /> {isLoading ? 'Starting Stream...' : 'Start Stream'}
              </Button>
            )}
            {isEditMode && (
              <Fragment>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleCancelEdit}
                >
                  Cancel Edit
                </Button>
                <Button
                  disabled={categories?.length === 0}
                  size="sm"
                  onClick={() => handleStreamDetailsSave(FORM_MODE.EDIT)}
                >
                  <Save /> {isLoading ? 'Saving...' : 'Save'}
                </Button>
              </Fragment>
            )}
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DetailsForm;

export function getStreamCrendentials(pushUrl: string): [string, string] | [] {
  if (!pushUrl) return [];

  const lastIndex = pushUrl.lastIndexOf('/');

  if (lastIndex === -1) throw new Error('Invalid URL format');

  const firstPart = pushUrl.slice(0, lastIndex);
  const secondPart = pushUrl.slice(lastIndex + 1);

  return [firstPart, secondPart];
}
