// ★ REEMPLAZA SOLO LA FUNCIÓN handleGeneralUpload EN TU ARCHIVO
const handleGeneralUpload = async () => {
  if (!leadSaved || !formConfirmed) {
    pushAgentMessage("عافاك عمر الفورمولار الأول ودير تأكيد، ومن بعد صيفط ليا الوثائق.");
    toast({
      title: "Primero confirma el formulario",
      description: "Debes guardar tus datos antes de subir documentos.",
      variant: "destructive",
    });
    return;
  }

  try {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*,application/pdf";
    input.multiple = true;

    input.onchange = async () => {
      const files = Array.from(input.files || []);
      if (!files.length) return;

      setGeneralUploading(true);
      setWaitingMohamed(true);
      setWaitingForDocument(false);
      assistantTextBufferRef.current = "";

      // ★ PASO 1: Conectar Mohamed PRIMERO (si no está conectado)
      const wasConnected = realtimeDcRef.current && realtimeDcRef.current.readyState === "open";
      if (!wasConnected) {
        console.log("Conectando a Mohamed...");
        await startListening();
        // Esperar a que se abra la conexión
        await new Promise((resolve) => {
          const checkInterval = setInterval(() => {
            if (dcOpenedRef.current && realtimeDcRef.current?.readyState === "open") {
              clearInterval(checkInterval);
              resolve(null);
            }
          }, 100);
          setTimeout(() => {
            clearInterval(checkInterval);
            resolve(null);
          }, 8000);
        });
      }

      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user?.id) {
          throw new Error("No hay usuario conectado en Supabase");
        }

        // ★ PASO 2: Procesar los archivos
        for (const file of files) {
          try {
            const currentDocs = [...docs];
            const safeName = `${Date.now()}_${slugifyFileName(file.name)}`;
            const storagePath = `${user.id}/regularizacion_2026/${safeName}`;

            const { error: uploadError } = await supabase.storage
              .from("user-documents")
              .upload(storagePath, file, { upsert: true });

            if (uploadError) throw new Error(uploadError.message);

            const result = await verifyDocument({
              file,
              expectedDocumentType: "auto",
              lang: "darija",
            });

            const matchedDoc = getBestDocMatch(
              result as VerifyDocumentResult,
              currentDocs,
              file.name
            );

            if (!matchedDoc) {
              pushAgentMessage(voiceTexts.uploadUnknown);
              
              // ★ Hacer hablar a Mohamed inmediatamente
              if (realtimeDcRef.current?.readyState === "open") {
                await askMohamedToSpeak(
                  `العميل صيفط دابا وثيقة سميتها ${file.name} ولكن مازال ما تربطاتش مزيان مع الملف. قل له شنو خاصو يصيفط بشكل واضح.`
                );
              }
              
              toast({
                title: ui.uploadErrorTitle,
                description: result.summary || ui.uploadErrorDesc,
                variant: "destructive",
              });
              continue;
            }

            const isWarn =
              result.status === "invalid" ||
              result.match_expected_type === false;

            const nextStatus: DocStatus = isWarn ? "warn" : "ok";

            const updatedDocs = currentDocs.map((doc) =>
              doc.id === matchedDoc.id
                ? {
                    ...doc,
                    estado: nextStatus,
                    archivo: file.name,
                    kb: `${Math.round(file.size / 1024)} KB`,
                    detectedType: result.document_type || "",
                    note: result.summary || "",
                    uploadedAt: new Date().toISOString(),
                    storagePath,
                  }
                : doc
            );

            setDocs(updatedDocs);

            const verificationStatus =
              nextStatus === "ok"
                ? "verified"
                : result.status === "invalid"
                ? "rejected"
                : "needs_review";

            const verificationNotes =
              result.summary ||
              (verificationStatus === "verified"
                ? "Documento verificado automáticamente"
                : verificationStatus === "rejected"
                ? "Documento rechazado por validación automática"
                : "Documento recibido. Pendiente de revisión");

            const { error: insertDocumentError } = await supabase
              .from("user_documents")
              .insert({
                user_id: user.id,
                case_id: null,
                document_type:
                  result.document_type || matchedDoc.expectedType || "general",
                title: matchedDoc.nombre || file.name,
                description: null,
                storage_bucket: "user-documents",
                file_path: storagePath,
                original_name: file.name,
                mime_type: file.type || "application/octet-stream",
                file_size: file.size,
                verification_status: verificationStatus,
                verification_notes: verificationNotes,
                extracted_data: {
                  summary: result.summary || "",
                  visible_fields: result.visible_fields || [],
                  warnings: result.warnings || [],
                  missing_or_unclear_fields: result.missing_or_unclear_fields || [],
                  usable_for_regularizacion_2026:
                    result.usable_for_regularizacion_2026 ?? null,
                  stay_proof_reason: result.stay_proof_reason || "",
                  recommended_bucket: result.recommended_bucket || "",
                  path: storagePath,
                },
                expires_at: null,
                is_required: true,
                reviewed_at:
                  verificationStatus === "verified"
                    ? new Date().toISOString()
                    : null,
                updated_at: new Date().toISOString(),
              });

            if (insertDocumentError) {
              console.error("Error guardando user_document:", insertDocumentError);
            }

            await saveFullStateToSupabase(updatedDocs);

            const localReply = buildDocSpeech(matchedDoc.nombre, result, nextStatus);
            
            // ★ PASO 3: Agregar mensaje a historial Y hacer que Mohamed lo diga
            pushAgentMessage(localReply);
            
            // ★ ASEGURAR que Mohamed está conectado ANTES de hablar
            if (realtimeDcRef.current?.readyState === "open" && !assistantBusyRef.current) {
              console.log("Mohamed hablando sobre documento...");
              await askMohamedToSpeak(localReply);
              
              // Esperar un poco para que Mohamed termine de procesar
              await new Promise((resolve) => setTimeout(resolve, 500));
            } else {
              console.warn("Mohamed no está disponible para hablar");
            }

            toast({
              title: ui.uploadSuccessTitle,
              description: result.summary || ui.uploadSuccessDesc,
            });

            await maybeSendCompletionMessage(updatedDocs);
          } catch (err: any) {
            console.error(err);
            toast({
              title: ui.uploadErrorTitle,
              description: err?.message || ui.uploadErrorDesc,
              variant: "destructive",
            });
            
            // ★ Hacer que Mohamed reporte el error
            if (realtimeDcRef.current?.readyState === "open") {
              await askMohamedToSpeak(
                `وقع مشكل فقراءة أو حفظ الوثيقة ${file.name}. قول للعميل يعاود يصيفطها بشكل أوضح أو بصيغة أخرى.`
              );
            }
          }
        }
      } finally {
        setGeneralUploading(false);
        setWaitingMohamed(false);
      }
    };

    input.click();
  } catch (error: any) {
    setGeneralUploading(false);
    toast({
      title: "Error",
      description: error?.message || "Error inesperado",
      variant: "destructive",
    });
  }
};
