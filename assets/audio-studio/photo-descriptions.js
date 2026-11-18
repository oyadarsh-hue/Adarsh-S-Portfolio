// These seven photo editions hold a single credited photograph throughout.
// Do not carry across the older films' translated descriptions or audio sprites.
const descriptions = Object.freeze({
  mca: ['A broad view of the Government Engineering College Thrissur main block. A paved drive leads past the light-coloured, multi-storey building. Rows of shaded balconies run along its side.',
    'തൃശ്ശൂർ ഗവൺമെന്റ് എൻജിനീയറിങ് കോളേജിന്റെ പ്രധാന കെട്ടിടമാണ് ചിത്രത്തിൽ. ഇളം നിറമുള്ള ബഹുനില കെട്ടിടത്തിന് മുന്നിലൂടെ ഒരു വഴി നീളുന്നു. വശത്ത് നിരയായി തണലുള്ള ബാൽക്കണികൾ കാണാം.'],
  bsc: ['A close-up of a green computer motherboard. Dark chips and long slots sit among fine circuitry. This is a computer hardware illustration, not a photograph of the college.',
    'പച്ച നിറമുള്ള കമ്പ്യൂട്ടർ മദർബോർഡിന്റെ അടുത്തുനിന്നുള്ള ദൃശ്യം. നേർത്ത സർക്യൂട്ടുകൾക്കിടയിൽ ഇരുണ്ട ചിപ്പുകളും നീളമുള്ള സ്ലോട്ടുകളും കാണാം. ഇത് കമ്പ്യൂട്ടർ ഭാഗത്തിന്റെ ചിത്രമാണ്, കോളേജിന്റേതല്ല.'],
  hse: ['A close-up of a microscope. Metal objective lenses point down towards the dark stage. This laboratory photograph illustrates the subject, not the school itself.',
    'ഒരു മൈക്രോസ്കോപ്പിന്റെ അടുത്തുനിന്നുള്ള ദൃശ്യം. ലോഹത്തിലുള്ള ഒബ്ജക്റ്റീവ് ലെൻസുകൾ താഴെ ഇരുണ്ട സ്റ്റേജിനുനേരെ നിൽക്കുന്നു. പഠനവിഷയവുമായി ബന്ധപ്പെട്ട ചിത്രമാണിത്, സ്കൂളിന്റേതല്ല.'],
  sslc: ['A panorama of Thamarassery Churam. Forested hills descend into a misty valley at left. A mountain road with parked vehicles curves along the right. This is a regional landscape, not the school campus.',
    'താമരശ്ശേരി ചുരത്തിന്റെ വിശാലദൃശ്യം. ഇടതുവശത്ത് കാടുമൂടിയ മലകൾ മഞ്ഞുള്ള താഴ്‌വരയിലേക്ക് ഇറങ്ങുന്നു. വലതുവശത്ത് വാഹനങ്ങൾ നിർത്തിയിട്ടിരിക്കുന്ന വളവുള്ള മലമ്പാത കാണാം. പ്രദേശത്തിന്റെ ദൃശ്യമാണിത്, സ്കൂൾ ക്യാമ്പസിന്റേതല്ല.'],
  bluegen: ['A laptop keyboard sits beneath a dark screen filled with lines of code. The photo illustrates software development and does not show the company office.',
    'കോഡിന്റെ വരികൾ നിറഞ്ഞ ഇരുണ്ട സ്ക്രീനിന് താഴെ ലാപ്‌ടോപ്പിന്റെ കീബോർഡ് കാണാം. സോഫ്റ്റ്‌വെയർ വികസനത്തെ സൂചിപ്പിക്കുന്ന ചിത്രമാണിത്, കമ്പനിയുടെ ഓഫീസിന്റേതല്ല.'],
  skybrisk: ['A close-up of pale keyboard keys in diagonal rows, with dark letters and symbols. This is a contextual photograph, not footage of the internship workplace.',
    'ഇളം നിറമുള്ള കീബോർഡ് കീകളുടെ അടുത്തുനിന്നുള്ള ദൃശ്യം. ചെരിഞ്ഞ നിരകളിലുള്ള കീകളിൽ ഇരുണ്ട അക്ഷരങ്ങളും ചിഹ്നങ്ങളും കാണാം. ഇത് വിഷയവുമായി ബന്ധപ്പെട്ട ചിത്രമാണ്, ഇന്റേൺഷിപ്പ് ചെയ്ത ഓഫീസിന്റേതല്ല.'],
  codtech: ['Blue and yellow network cables curve across the frame into a row of ports. The photograph illustrates networking hardware; it is not footage from the workplace.',
    'നീലയും മഞ്ഞയും നിറമുള്ള നെറ്റ്‌വർക്ക് കേബിളുകൾ വളഞ്ഞ് നിരയായ പോർട്ടുകളിലേക്ക് പോകുന്നു. നെറ്റ്‌വർക്ക് ഉപകരണത്തെ കാണിക്കുന്ന ചിത്രമാണിത്, ജോലി ചെയ്ത സ്ഥാപനത്തിന്റേതല്ല.']
});
export function photoDescription(film, slug, edition) {
  if (edition === 'original' || !Object.hasOwn(descriptions, slug)) return film;
  const [description, ml] = descriptions[slug];
  return {...film, description, translations: {ml}, audio: {}};
}
