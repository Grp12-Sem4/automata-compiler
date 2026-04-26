const outputPanel = document.getElementById("outputPanel");
const statusText = document.getElementById("statusText");
const runButton = document.getElementById("runButton");
const saveButton = document.getElementById("saveButton");

const starterProgram = [
	"// --- 1. Variables & Basic Arithmetic ---",
	"const a = 10;",
	"let b = 3;",
	'print("Basic Math (10 + 3):");',
	"print(a + b);",
	'print("Modulo (10 % 3):");',
	"print(a % b);",
	"",
	"// --- 2. Strings & String Functions ---",
	'let greeting = "Hello";',
	'let target = "Compiler";',
	'print("String Concatenation:");',
	'print(greeting + " " + target);',
	"",
	'print("Length of greeting:");',
	"print(len(greeting));",
	"",
	"// --- 3. Booleans & Logical Operators ---",
	"let isReady = true;",
	"let isBroken = !isReady;",
	"",
	"if (a > b && isReady) {",
	'    print("Logic works perfectly!");',
	"} else {",
	'    print("This should not print.");',
	"}",
	"",
	"// --- 4. Loops & Reassignment ---",
	'print("While loop counting 0 to 2:");',
	"let counter = 0;",
	"while (counter < 3) {",
	"    print(counter);",
	"    counter = counter + 1;",
	"}",
	"",
	"// --- 5. Input & Type Conversion ---",
	"// Note: When it hits input(), it will ask you for a value in the browser popup!",
	'print("Type a number in the input prompt:");',
	"let userStr = input();",
	"let userNum = toInt(userStr);",
	"",
	'print("You entered:");',
	"print(userNum);",
	'print("Your number multiplied by 10 is:");',
	"print(userNum * 10);",
].join("\n");

let editor;
let currentTab = "execution";
let lastPayload = null;

function setStatus(message, isError = false) {
	statusText.textContent = message;
	outputPanel.className = isError
		? "output output--error"
		: "output output--success";
}

function setOutput(content) {
	outputPanel.textContent = content;
}

function saveProgram() {
	if (!editor) {
		setStatus("Editor not ready", true);
		return;
	}

	const blob = new Blob([editor.getValue()], {
		type: "text/plain;charset=utf-8",
	});
	const link = document.createElement("a");
	link.href = URL.createObjectURL(blob);
	link.download = "program.code";
	link.click();
	URL.revokeObjectURL(link.href);
	setStatus("Saved locally");
}

function renderOutputView() {
	if (!lastPayload) return;

	if (lastPayload.success === false) {
		setOutput(lastPayload.error.message || "An error occurred.");
		return;
	}

	if (currentTab === "execution") {
		setOutput(lastPayload.output || "(no output)");
	} else if (currentTab === "tokens") {
		setOutput(JSON.stringify(lastPayload.tokens, null, 2));
	} else if (currentTab === "ast") {
		setOutput(JSON.stringify(lastPayload.ast, null, 2));
	} else if (currentTab === "memory") {
		setOutput(JSON.stringify(lastPayload.symbolTable || {}, null, 2));
	}
}

async function runProgram() {
	if (!editor) {
		setStatus("Editor not ready", true);
		return;
	}

	setStatus("Running...");
	setOutput("Compiling program...");

	monaco.editor.setModelMarkers(editor.getModel(), "compiler", []);

	try {
		const code = editor.getValue();
		let userInput = "";

		const cleanedCode = code.replace(/\/\/.*/g, "").replace(/"[^"]*"/g, "");

		if (/\binput\s*\(/.test(cleanedCode)) {
			userInput = prompt("Enter input for the program:");

			if (userInput === null) {
				setStatus("Ready");
				setOutput("Execution cancelled by user.");
				return;
			}
		}

		const response = await fetch("/run", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ code, userInput }),
		});

		const payload = await response.json();

		if (!response.ok || payload.success === false) {
			let errorText = "";
			const markers = [];

			const getEndColumn = (line, column) => {
				let endCol = column + 1;
				const model = editor.getModel();
				if (model && line <= model.getLineCount()) {
					const lineContent = model.getLineContent(line);
					const textFromError = lineContent.substring(column - 1);

					const match = textFromError.match(
						/^([a-zA-Z0-9_]+|[^a-zA-Z0-9_\s]+)/,
					);
					if (match) {
						endCol = column + match[1].length;
					}
				}
				return endCol;
			};

			if (payload.errors && Array.isArray(payload.errors)) {
				errorText = payload.errors
					.map((error) => {
						const location =
							error.line && error.column
								? `Line ${error.line}, Column ${error.column}`
								: "Unknown location";

						const snippet = error.snippet
							? `\n${error.snippet}\n${error.pointer || ""}`
							: "";

						if (error.line && error.column) {
							markers.push({
								startLineNumber: error.line,
								startColumn: error.column,
								endLineNumber: error.line,
								endColumn: getEndColumn(error.line, error.column),
								message: `[${error.phase || "error"}] ${error.message}`,
								severity: monaco.MarkerSeverity.Error,
							});
						}

						return `[${error.phase || "error"}] ${location}: ${error.message}${snippet}`;
					})
					.join("\n\n");
			} else if (payload.error && typeof payload.error === "object") {
				const error = payload.error;

				const location =
					error.line && error.column
						? `Line ${error.line}, Column ${error.column}`
						: "Unknown location";

				const snippet = error.snippet
					? `\n${error.snippet}\n${error.pointer || ""}`
					: "";

				if (error.line && error.column) {
					markers.push({
						startLineNumber: error.line,
						startColumn: error.column,
						endLineNumber: error.line,
						endColumn: getEndColumn(error.line, error.column),
						message: `[${error.phase || "error"}] ${error.message}`,
						severity: monaco.MarkerSeverity.Error,
					});
				}

				errorText = `[${error.phase || "error"}] ${location}: ${error.message}${snippet}`;
			} else {
				errorText = payload.error || "Compiler execution failed.";
			}

			if (markers.length > 0) {
				monaco.editor.setModelMarkers(editor.getModel(), "compiler", markers);
			}
			lastPayload = null;
			setOutput(errorText);
			setStatus("Run failed", true);
			return;
		}

		lastPayload = payload;
		renderOutputView();
		setStatus("Run complete");
	} catch (error) {
		setOutput(error.message);
		setStatus("Run failed", true);
	}
}

if (!window.require) {
	setOutput(
		"Monaco loader failed to load. Check your network connection and refresh.",
	);
	setStatus("Editor unavailable", true);
} else {
	window.require.config({
		paths: {
			vs: "https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.52.2/min/vs",
		},
	});

	window.require(["vs/editor/editor.main"], () => {
		editor = window.monaco.editor.create(document.getElementById("editor"), {
			value: starterProgram,
			language: "javascript",
			theme: "vs-dark",
			automaticLayout: true,
			fontSize: 14,
			minimap: { enabled: false },
			roundedSelection: false,
			scrollBeyondLastLine: false,
		});

		setOutput("Press Run to execute the compiler pipeline.");
		setStatus("Ready");
	});
}

runButton.addEventListener("click", runProgram);
saveButton.addEventListener("click", saveProgram);

document.getElementById("outputTabs").addEventListener("click", (e) => {
	if (e.target.classList.contains("tab")) {
		// Update active class
		document
			.querySelectorAll(".tab")
			.forEach((t) => t.classList.remove("active"));
		e.target.classList.add("active");

		// Switch tab and render
		currentTab = e.target.getAttribute("data-target");
		renderOutputView();
	}
});
