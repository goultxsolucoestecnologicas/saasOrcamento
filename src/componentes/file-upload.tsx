"use client";
import { useEffect, useRef, useState } from "react";
import { ImagePlus, Upload, X } from "lucide-react";
import { Button } from "@/componentes/ui/button";
export function FileUpload({
  arquivo,
  urlAtual,
  nome,
  erro,
  ocupado,
  aoAlterar,
  aoErro,
}: {
  arquivo?: File;
  urlAtual?: string;
  nome: string;
  erro?: string;
  ocupado?: boolean;
  aoAlterar: (f?: File) => void;
  aoErro: (m: string) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string>();
  useEffect(() => {
    if (!arquivo) return;
    const leitor = new FileReader();
    leitor.onload = () => setPreview(String(leitor.result));
    leitor.readAsDataURL(arquivo);
    return () => {
      leitor.onload = null;
      if (leitor.readyState === FileReader.LOADING) leitor.abort();
    };
  }, [arquivo]);
  const imagem = arquivo ? preview : urlAtual;
  return (
    <div>
      <div className="logo-preview">
        {imagem ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imagem}
            alt={`Prévia da logo de ${nome}`}
            width={152}
            height={80}
          />
        ) : (
          <ImagePlus size={32} aria-label="Logo ainda não definida" />
        )}
      </div>
      <div className="logo-acoes">
        <Button
          id="logo-alterar"
          type="button"
          variant="outline"
          disabled={ocupado}
          onClick={() => input.current?.click()}
        >
          <Upload aria-hidden="true" />
          {imagem ? "Alterar logo" : "Selecionar logo"}
        </Button>
        {arquivo && (
          <Button
            type="button"
            variant="ghost"
            disabled={ocupado}
            onClick={() => {
              aoAlterar(undefined);
              aoErro("");
              if (input.current) input.current.value = "";
            }}
          >
            <X aria-hidden="true" />
            Remover seleção
          </Button>
        )}
      </div>
      <label className="sr-only" htmlFor="logo">
        Selecionar imagem
      </label>
      <input
        ref={input}
        id="logo"
        className="sr-only"
        type="file"
        accept="image/png,image/jpeg,.png,.jpg,.jpeg"
        disabled={ocupado}
        aria-invalid={!!erro || undefined}
        aria-describedby={erro ? "logo-erro" : "logo-ajuda"}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          if (
            !/\.(png|jpe?g)$/i.test(f.name) ||
            !["image/png", "image/jpeg"].includes(f.type) ||
            f.size > 2 * 1024 * 1024
          ) {
            aoErro("Selecione uma imagem PNG ou JPEG com até 2 MB.");
            e.target.value = "";
            return;
          }
          aoErro("");
          aoAlterar(f);
        }}
      />
      {erro && (
        <p className="erro-campo" id="logo-erro">
          {erro}
        </p>
      )}
      <p className="logo-ajuda" id="logo-ajuda">
        PNG ou JPEG, até 2 MB.{" "}
        {arquivo
          ? "Seleção pronta para salvar."
          : "A logo aparece no cabeçalho do PDF."}
      </p>
    </div>
  );
}
