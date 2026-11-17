const progress=message=>self.postMessage({status:'progress',message});
self.onmessage=async ({data:{samples,language}})=>{
  try{
    progress('Loading the speech model. Completed files are cached by your browser…');
    const {pipeline,env}=await import('./vendor/transformers.mjs');
    env.allowLocalModels=false;env.useBrowserCache=true;
    env.backends.onnx.wasm.numThreads=1;env.backends.onnx.wasm.proxy=false;
    const transcriber=await pipeline('automatic-speech-recognition','Xenova/whisper-tiny',{
      device:'wasm',dtype:'q8',
      progress_callback:({status,file,progress:percent})=>{
        if(status==='progress' && Number.isFinite(percent)) progress('Downloading '+file.split('/').pop()+' · '+Math.round(percent)+'%');
        if(status==='ready') progress('Listening to your recording locally…');
      }
    });
    progress('Transcribing locally. Longer recordings may take several minutes…');
    const output=await transcriber(samples,{language,task:'transcribe',chunk_length_s:30,stride_length_s:5});
    if(!output.text?.trim()) throw Error('No speech was recognized. Try a clearer recording or paste its transcript.');
    self.postMessage({status:'done',result:output.text.trim()});
  }catch(err){self.postMessage({status:'error',message:'Transcription could not finish. Check your connection for the first model download, try again, or paste a transcript. '+err.message});}
};
