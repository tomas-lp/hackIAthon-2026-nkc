-- Agregar la columna para la descripción generada por la IA
ALTER TABLE "public"."reports"
  ADD COLUMN IF NOT EXISTS "descripcion_imagen" "text";

-- Insertar el bucket "reports-photos" si no existe
INSERT INTO storage.buckets (id, name, public)
VALUES ('reports-photos', 'reports-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Crear políticas de seguridad (RLS) para el bucket
-- Permitimos lectura pública para que la web pueda mostrar las fotos
CREATE POLICY "Public Access" 
ON storage.objects FOR SELECT 
USING ( bucket_id = 'reports-photos' );

-- Permitimos a la cuenta de servicio (Edge Function) subir imágenes
CREATE POLICY "Service Role Upload" 
ON storage.objects FOR INSERT 
WITH CHECK ( bucket_id = 'reports-photos' );

-- Permitimos a la cuenta de servicio (Edge Function) actualizar imágenes
CREATE POLICY "Service Role Update" 
ON storage.objects FOR UPDATE 
WITH CHECK ( bucket_id = 'reports-photos' );
