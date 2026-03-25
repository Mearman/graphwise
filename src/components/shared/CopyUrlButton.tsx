import { Button } from "@mantine/core";
import { IconCopy, IconCheck } from "@tabler/icons-react";
import { useState } from "react";

export function CopyUrlButton(): React.ReactElement {
	const [copied, setCopied] = useState(false);

	const handleCopy = (): void => {
		navigator.clipboard
			.writeText(window.location.href)
			.then(() => {
				setCopied(true);
				setTimeout(() => {
					setCopied(false);
				}, 2000);
			})
			.catch((_err: unknown) => {
				// Silently fail, user feedback already provided
			});
	};

	return (
		<Button
			size="xs"
			variant="light"
			leftSection={copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
			onClick={handleCopy}
			title="Current state is encoded in URL"
		>
			{copied ? "Copied" : "Copy URL"}
		</Button>
	);
}
