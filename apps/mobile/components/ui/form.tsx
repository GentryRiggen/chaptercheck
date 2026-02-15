import { createContext, type ReactNode, useContext, useId } from "react";
import { Text, View } from "react-native";
import {
  Controller,
  type ControllerProps,
  type FieldPath,
  type FieldValues,
  FormProvider,
  useFormContext,
} from "react-hook-form";

import { cn } from "@chaptercheck/tailwind-config/cn";

// --- Form (re-export of FormProvider) ---

const Form = FormProvider;

// --- FormField Context ---

interface FormFieldContextValue {
  name: string;
}

const FormFieldContext = createContext<FormFieldContextValue | null>(null);

// --- FormItem Context ---

interface FormItemContextValue {
  id: string;
}

const FormItemContext = createContext<FormItemContextValue | null>(null);

// --- useFormField hook ---

function useFormField() {
  const fieldContext = useContext(FormFieldContext);
  const itemContext = useContext(FormItemContext);
  const { getFieldState, formState } = useFormContext();

  if (!fieldContext) {
    throw new Error("useFormField must be used within a <FormField>");
  }

  if (!itemContext) {
    throw new Error("useFormField must be used within a <FormItem>");
  }

  const fieldState = getFieldState(fieldContext.name, formState);

  return {
    id: itemContext.id,
    name: fieldContext.name,
    ...fieldState,
  };
}

// --- FormField ---

function FormField<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>(props: ControllerProps<TFieldValues, TName>) {
  return (
    <FormFieldContext.Provider value={{ name: props.name }}>
      <Controller {...props} />
    </FormFieldContext.Provider>
  );
}

// --- FormItem ---

interface FormItemProps {
  children: ReactNode;
  className?: string;
}

function FormItem({ children, className }: FormItemProps) {
  const id = useId();

  return (
    <FormItemContext.Provider value={{ id }}>
      <View className={cn("gap-2", className)}>{children}</View>
    </FormItemContext.Provider>
  );
}

// --- FormLabel ---

interface FormLabelProps {
  children: ReactNode;
  className?: string;
}

function FormLabel({ children, className }: FormLabelProps) {
  const { error } = useFormField();

  return (
    <Text
      className={cn("text-sm font-medium text-foreground", error && "text-destructive", className)}
    >
      {children}
    </Text>
  );
}

// --- FormControl ---

interface FormControlProps {
  children: ReactNode;
}

function FormControl({ children }: FormControlProps) {
  return <>{children}</>;
}

// --- FormDescription ---

interface FormDescriptionProps {
  children: ReactNode;
  className?: string;
}

function FormDescription({ children, className }: FormDescriptionProps) {
  return <Text className={cn("text-xs text-muted-foreground", className)}>{children}</Text>;
}

// --- FormMessage ---

interface FormMessageProps {
  children?: ReactNode;
  className?: string;
}

function FormMessage({ children, className }: FormMessageProps) {
  const { error } = useFormField();
  const body = error ? String(error.message ?? "") : children;

  if (!body) {
    return null;
  }

  return <Text className={cn("text-xs font-medium text-destructive", className)}>{body}</Text>;
}

export {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
  useFormField,
};
