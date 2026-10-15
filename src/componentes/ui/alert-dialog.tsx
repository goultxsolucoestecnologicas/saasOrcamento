"use client";
import * as React from "react";
import * as Primitive from "@radix-ui/react-alert-dialog";
import { cn } from "@/bibliotecas/utilitarios";
// Receita shadcn/ui personalizada com os tokens e superfícies deste projeto.
export const Root = Primitive.Root;
export const Trigger = Primitive.Trigger;
export const Portal = Primitive.Portal;
export const Title = Primitive.Title;
export const Description = Primitive.Description;
export const Cancel = Primitive.Cancel;
export const Action = Primitive.Action;
export function Overlay({
  className,
  ...props
}: React.ComponentProps<typeof Primitive.Overlay>) {
  return (
    <Primitive.Overlay className={cn("dialog-overlay", className)} {...props} />
  );
}
export function Content({
  className,
  ...props
}: React.ComponentProps<typeof Primitive.Content>) {
  return (
    <Primitive.Content
      className={cn("dialog-conteudo", className)}
      {...props}
    />
  );
}
export {
  Root as AlertDialog,
  Trigger as AlertDialogTrigger,
  Portal as AlertDialogPortal,
  Title as AlertDialogTitle,
  Description as AlertDialogDescription,
  Cancel as AlertDialogCancel,
  Action as AlertDialogAction,
  Overlay as AlertDialogOverlay,
  Content as AlertDialogContent,
};
