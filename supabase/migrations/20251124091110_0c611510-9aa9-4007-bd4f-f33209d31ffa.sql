-- Add missing UPDATE policy to chiqindilar table
CREATE POLICY "Users can update their own chiqindilar"
ON public.chiqindilar
FOR UPDATE
USING (auth.uid() = user_id);