import { useRef, useState } from 'react'

const MAX_FILE_SIZE = 5 * 1024 * 1024

function Icon({ name, className = 'h-5 w-5' }) {
  const shared = {
    className,
    fill: 'none',
    stroke: 'currentColor',
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    strokeWidth: 1.8,
    viewBox: '0 0 24 24',
    'aria-hidden': true,
  }

  if (name === 'arrow') {
    return <svg {...shared}><path d="M7 17 17 7M7 7h10v10" /></svg>
  }
  if (name === 'check') {
    return <svg {...shared}><path d="m5 12 4 4L19 6" /></svg>
  }
  if (name === 'file') {
    return <svg {...shared}><path d="M13 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10z" /><path d="M13 3v7h7M8 14h8M8 17h5" /></svg>
  }
  if (name === 'spark') {
    return <svg {...shared}><path d="m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2L12 3Z" /><path d="m19 14 .9 2.1L22 17l-2.1.9L19 20l-.9-2.1L16 17l2.1-.9L19 14Z" /></svg>
  }
  return <svg {...shared}><path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" /><path d="m9 12 2 2 4-4" /></svg>
}

function App() {
  const inputRef = useRef(null)
  const [file, setFile] = useState(null)
  const [jobDescription, setJobDescription] = useState('')
  const [error, setError] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [result, setResult] = useState(null)

  function selectFile(nextFile) {
    setError('')
    setResult(null)
    if (!nextFile) return

    const extension = nextFile.name.split('.').pop()?.toLowerCase()
    if (extension !== 'pdf') {
      setFile(null)
      setError('Please choose a PDF file.')
      return
    }
    if (nextFile.size > MAX_FILE_SIZE) {
      setFile(null)
      setError('Your resume needs to be 5 MB or smaller.')
      return
    }
    setFile(nextFile)
  }

  function handleDrop(event) {
    event.preventDefault()
    setIsDragging(false)
    selectFile(event.dataTransfer.files?.[0])
  }

  function formatFileSize(size) {
    return size < 1024 * 1024
      ? `${Math.max(1, Math.round(size / 1024))} KB`
      : `${(size / (1024 * 1024)).toFixed(1)} MB`
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setResult(null)

    if (!file) {
      setError('Choose a PDF resume to continue.')
      return
    }
    if (!jobDescription.trim()) {
      setError('Paste the job description you want to compare against.')
      return
    }

    const formData = new FormData()
    formData.append('resume', file)
    formData.append('jobDescription', jobDescription)
    setIsSubmitting(true)

    try {
      const response = await fetch('/api/resume', {
        method: 'POST',
        body: formData,
      })
      const responseText = await response.text()
      let body

      try {
        body = responseText ? JSON.parse(responseText) : null
      } catch {
        const statusMessage = `HTTP ${response.status}`
        throw new Error(
          response.ok
            ? `The server returned an unreadable response (${statusMessage}). Please try again.`
            : `The server could not complete the request (${statusMessage}). Check the server deployment logs if this continues.`,
        )
      }

      if (!body) {
        throw new Error(
          `The server returned an empty response (HTTP ${response.status}). Check the server deployment logs if this continues.`,
        )
      }

      if (!response.ok || !body.success) {
        throw new Error(
          body.error?.message ||
            `The resume could not be analyzed (HTTP ${response.status}).`,
        )
      }
      if (!body.data) {
        throw new Error('The server response did not include analysis results. Please try again.')
      }
      setResult(body.data)
    } catch (requestError) {
      setError(requestError.message || 'Unable to reach the analysis service. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen overflow-hidden bg-[#f7f7f2] text-[#20241f]">
      <header className="relative z-10 mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-5 sm:px-10 lg:px-12">
        <a href="#" className="flex items-center gap-2.5" aria-label="nextpage home">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#c8f169] text-[#20241f]">
            <Icon name="file" className="h-[19px] w-[19px]" />
          </span>
          <span className="text-[19px] font-bold tracking-[-0.8px]">nextpage</span>
        </a>
        <a
          href="#how-it-works"
          className="group inline-flex items-center gap-2 rounded-full border border-[#dedfd7] bg-white/60 px-4 py-2.5 text-sm font-semibold transition hover:border-[#20241f] sm:px-5"
        >
          How it works
          <Icon name="arrow" className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </a>
      </header>

      <main>
        <section className="relative mx-auto grid w-full max-w-7xl items-center gap-14 px-6 pb-20 pt-10 sm:px-10 sm:pt-14 lg:grid-cols-[1.04fr_0.96fr] lg:gap-16 lg:px-12 lg:pb-28 lg:pt-16">
          <div className="pointer-events-none absolute -left-32 top-24 h-80 w-80 rounded-full bg-[#d9f4a6]/40 blur-3xl" />
          <div className="pointer-events-none absolute right-[-100px] top-12 h-96 w-96 rounded-full bg-[#e5eadb]/70 blur-3xl" />

          <div className="relative z-10 max-w-[610px]">
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-[#dfe5d4] bg-white/80 px-3.5 py-2 text-xs font-semibold tracking-[0.03em] text-[#566448] shadow-sm sm:text-sm">
              <span className="h-2 w-2 rounded-full bg-[#8abd3c]" />
              YOUR NEXT CHAPTER STARTS HERE
            </div>
            <h1 className="max-w-[650px] text-[clamp(3.5rem,7vw,5.75rem)] font-semibold leading-[0.99] tracking-[-0.075em]">
              Hey, let&apos;s get your resume <span className="font-serif font-medium italic tracking-[-0.065em] text-[#709b36]">noticed.</span>
            </h1>
            <p className="mt-7 max-w-[480px] text-base leading-7 text-[#696f65] sm:text-lg sm:leading-8">
              Drop in your resume, get it reviewed, and see your score. A clearer picture of what&apos;s working—and what to do next.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm font-medium text-[#555d50]">
              <span className="inline-flex items-center gap-2"><Icon name="check" className="h-4 w-4 text-[#769d41]" /> Clear, useful feedback</span>
              <span className="inline-flex items-center gap-2"><Icon name="check" className="h-4 w-4 text-[#769d41]" /> Secure server-side analysis</span>
            </div>

            <div className="mt-12 hidden items-center gap-4 border-t border-[#e5e7df] pt-6 lg:flex">
              <div className="flex -space-x-2">
                <span className="grid h-9 w-9 place-items-center rounded-full border-2 border-[#f7f7f2] bg-[#ecd0b5] text-xs font-bold text-[#513b2e]">J</span>
                <span className="grid h-9 w-9 place-items-center rounded-full border-2 border-[#f7f7f2] bg-[#d2dbbd] text-xs font-bold text-[#45523a]">M</span>
                <span className="grid h-9 w-9 place-items-center rounded-full border-2 border-[#f7f7f2] bg-[#dfd4eb] text-xs font-bold text-[#554466]">A</span>
              </div>
              <p className="text-sm text-[#73786d]"><span className="font-semibold text-[#33392f]">One small step,</span> a stronger application.</p>
            </div>
          </div>

          <div className="relative z-10 mx-auto w-full max-w-[520px] lg:ml-auto">
            <div className="absolute -right-4 -top-6 h-24 w-24 rounded-full border border-dashed border-[#cbd5be] sm:-right-8 sm:-top-10 sm:h-32 sm:w-32" />
            <div className="relative rounded-[28px] border border-[#e7e9e1] bg-white p-5 shadow-[0_24px_80px_-36px_rgba(39,54,25,0.28)] sm:p-7">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-lg font-semibold tracking-[-0.04em]">Let&apos;s take a look</p>
                  <p className="mt-1 text-sm text-[#858a81]">Add your resume to get started</p>
                </div>
                <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#f1f6e8] text-[#709b36]">
                  <Icon name="spark" className="h-5 w-5" />
                </span>
              </div>

              <div
                onDragEnter={(event) => { event.preventDefault(); setIsDragging(true) }}
                onDragOver={(event) => event.preventDefault()}
                onDragLeave={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget)) setIsDragging(false)
                }}
                onDrop={handleDrop}
                className={`relative flex min-h-[220px] flex-col items-center justify-center rounded-[20px] border-2 border-dashed px-5 py-7 text-center transition-colors sm:min-h-[235px] ${
                  isDragging ? 'border-[#709b36] bg-[#f4f9e9]' : 'border-[#dfe3d8] bg-[#fafbf8]'
                }`}
              >
                <input
                  ref={inputRef}
                  type="file"
                  accept=".pdf,application/pdf"
                  className="sr-only"
                  aria-label="Choose your resume"
                  onChange={(event) => {
                    selectFile(event.target.files?.[0])
                    event.target.value = ''
                  }}
                />
                {file ? (
                  <>
                    <span className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-[#eaf3dc] text-[#709b36]">
                      <Icon name="file" className="h-6 w-6" />
                    </span>
                    <p className="max-w-full truncate text-sm font-semibold">{file.name}</p>
                    <p className="mt-1 text-xs text-[#858a81]">{formatFileSize(file.size)} · Ready to review</p>
                    <button
                      type="button"
                      className="mt-3 text-xs font-semibold text-[#6f8e43] underline decoration-[#c1d2a5] underline-offset-4 hover:text-[#415c22]"
                      onClick={() => { setFile(null); setResult(null); setError('') }}
                    >
                      Choose a different file
                    </button>
                  </>
                ) : (
                  <>
                    <span className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-[#eef2e8] text-[#71865b]">
                      <Icon name="file" className="h-6 w-6" />
                    </span>
                    <p className="text-sm font-semibold">Drag and drop your resume here</p>
                    <p className="mt-1.5 text-sm text-[#858a81]">or choose a file from your device</p>
                    <button
                      type="button"
                      className="mt-4 rounded-xl border border-[#dfe3d8] bg-white px-4 py-2 text-sm font-semibold shadow-sm transition hover:border-[#9baa87] hover:bg-[#fbfcf9]"
                      onClick={() => inputRef.current?.click()}
                    >
                      Browse files
                    </button>
                  </>
                )}
              </div>

              <label htmlFor="job-description" className="mb-2 mt-5 block text-sm font-semibold">
                Job description
              </label>
              <textarea
                id="job-description"
                value={jobDescription}
                onChange={(event) => { setJobDescription(event.target.value); setResult(null); setError('') }}
                placeholder="Paste the job description here so we can compare its requirements with your resume."
                rows={5}
                maxLength={100000}
                className="w-full resize-y rounded-xl border border-[#dfe3d8] bg-[#fafbf8] px-4 py-3 text-sm leading-6 outline-none transition placeholder:text-[#9a9f95] focus:border-[#91ad6a] focus:ring-2 focus:ring-[#d9f4a6]/60"
                aria-describedby="job-description-help"
              />
              <p id="job-description-help" className="mt-1 text-xs text-[#92978d]">
                Resume text and the job description are sent to labd. After analysis, the extracted text and score are saved in MongoDB. Avoid uploading sensitive information.
              </p>

              <p className={`mt-3 min-h-5 text-center text-xs ${error ? 'text-[#b5473b]' : 'text-[#92978d]'}`} role={error ? 'alert' : 'status'}>
                {error || 'Text PDFs and scanned PDFs · Up to 5 MB'}
              </p>

              <button
                type="button"
                disabled={!file || !jobDescription.trim() || isSubmitting}
                onClick={handleSubmit}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[#20241f] px-5 py-4 text-sm font-semibold text-white transition hover:bg-[#363d32] disabled:cursor-not-allowed disabled:bg-[#d9ddd4] disabled:text-[#858a81]"
              >
                {isSubmitting ? 'Comparing your resume…' : 'Compare my resume'}
                {!isSubmitting && <Icon name="arrow" className="h-4 w-4" />}
              </button>
              <p className="mt-3 text-center text-[11px] leading-5 text-[#979c92]">
                Your extracted resume text, job description, and score are saved after analysis.
              </p>

              {result && (
                <section className="mt-5 rounded-2xl border border-[#e3ebd8] bg-[#f6faef] p-5" aria-live="polite" aria-label="Resume analysis results">
                  <div className="flex items-center gap-4">
                    <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full border-[5px] border-[#c7e29b] text-xl font-bold tracking-[-0.06em] text-[#496a26]">
                      {result.score}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">Resume match score</p>
                      <p className="mt-1 text-xs leading-5 text-[#737c69]">
                        {result.matchedCount} of {result.totalKeywords} key requirements matched for {result.fileName}.
                      </p>
                    </div>
                  </div>
                  <p className="mt-4 text-xs leading-5 text-[#737c69]">
                    {result.summary} This AI-generated estimate is not a hiring decision; review the requirements and your experience together.
                  </p>
                  <p className="mt-2 text-[11px] text-[#858a81]">
                    labd allowance: {result.creditsPercentLeft}% remaining
                  </p>
                  {result.matchedKeywords.length > 0 && (
                    <div className="mt-4">
                      <h3 className="text-xs font-bold uppercase tracking-[0.08em] text-[#496a26]">Relevant strengths</h3>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {result.matchedKeywords.map((keyword) => (
                          <span key={keyword} className="rounded-full bg-white px-2.5 py-1 text-xs text-[#526943]">{keyword}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {result.missingKeywords.length > 0 && (
                    <div className="mt-4">
                      <h3 className="text-xs font-bold uppercase tracking-[0.08em] text-[#7a6541]">Requirements to address</h3>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {result.missingKeywords.map((keyword) => (
                          <span key={keyword} className="rounded-full bg-white px-2.5 py-1 text-xs text-[#766546]">{keyword}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="mt-4">
                    <h3 className="text-xs font-bold uppercase tracking-[0.08em] text-[#496a26]">Suggestions</h3>
                    <ul className="mt-2 space-y-2 text-xs leading-5 text-[#737c69]">
                      {result.recommendations.map((recommendation) => (
                        <li key={recommendation}>{recommendation}</li>
                      ))}
                    </ul>
                  </div>
                </section>
              )}
            </div>

            <div className="absolute -bottom-7 -left-3 hidden items-center gap-3 rounded-2xl border border-[#e8eae3] bg-white px-4 py-3 shadow-[0_12px_36px_-18px_rgba(39,54,25,0.35)] sm:flex lg:-left-10">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#eff5e5] text-[#729a3e]">
                <Icon name="shield" className="h-[18px] w-[18px]" />
              </span>
              <span className="text-xs font-semibold leading-5">Saved after analysis<br />              <span className="font-normal text-[#858a81]">Results stored in MongoDB.</span></span>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="border-y border-[#e7e9e1] bg-white/60">
          <div className="mx-auto max-w-7xl px-6 py-16 sm:px-10 lg:px-12 lg:py-20">
            <div className="mb-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <p className="text-xs font-bold tracking-[0.14em] text-[#789849]">SIMPLE AS 1, 2, 3</p>
                <h2 className="mt-3 text-3xl font-semibold tracking-[-0.06em] sm:text-4xl">A better resume starts here.</h2>
              </div>
              <p className="max-w-sm text-sm leading-6 text-[#777d72]">A little clarity goes a long way. Get a starting point for your next application.</p>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {[
                ['01', 'Add your resume', 'Upload a PDF and paste in the job description you are targeting.'],
                ['02', 'Get your score', 'See how many important job-description keywords appear in your resume.'],
                ['03', 'Make your next move', 'Use the missing-keyword suggestions to tailor your application.'],
              ].map(([number, title, description]) => (
                <article key={number} className="rounded-2xl border border-[#e8eae3] bg-[#fbfcf9] p-6 sm:p-7">
                  <span className="text-xs font-bold tracking-[0.12em] text-[#85a35b]">{number}</span>
                  <h3 className="mt-5 text-lg font-semibold tracking-[-0.03em]">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-[#7b8177]">{description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="mx-auto flex w-full max-w-7xl flex-col gap-2 px-6 py-7 text-xs text-[#90958b] sm:flex-row sm:items-center sm:justify-between sm:px-10 lg:px-12">
        <span className="font-semibold tracking-[-0.02em] text-[#596052]">nextpage</span>
        <span>Scanned PDFs supported with private, on-server text recognition.</span>
      </footer>
    </div>
  )
}

export default App
