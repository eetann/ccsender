import { describe, test, expect, mock, beforeEach } from "bun:test";
import { createTempFile } from "../../src/utils/tempFile";

// Mock external dependencies
mock.module("node:fs/promises", () => ({
	mkdtemp: mock(),
	writeFile: mock(),
}));

mock.module("node:os", () => ({
	tmpdir: mock(),
}));

mock.module("node:path", () => ({
	join: mock(),
}));

describe("TempFile Utility", () => {
	beforeEach(() => {
		mock.restore();
	});

	describe("createTempFile", () => {
		test("should create temporary file with correct naming pattern", async () => {
			const mockTmpDir = "/tmp";
			const mockTempDir = "/tmp/ccinput-abcdef";
			const mockFilePath = "/tmp/ccinput-abcdef/.ccinput-20240615123045.md";

			const tmpdirMock = mock(() => mockTmpDir);
			mock.module("node:os", () => ({
				tmpdir: tmpdirMock,
			}));

			const joinMock = mock((...paths: string[]) => paths.join("/"));
			mock.module("node:path", () => ({
				join: joinMock,
			}));

			const mkdtempMock = mock(() => Promise.resolve(mockTempDir));
			const writeFileMock = mock(() => Promise.resolve());
			mock.module("node:fs/promises", () => ({
				mkdtemp: mkdtempMock,
				writeFile: writeFileMock,
			}));

			// Mock Date for consistent filename
			const originalDate = Date;
			const mockDate = new Date("2024-06-15T12:30:45.000Z");
			global.Date = mock(() => mockDate) as any;
			global.Date.now = originalDate.now;

			const result = await createTempFile();

			// Restore Date
			global.Date = originalDate;

			expect(mkdtempMock).toHaveBeenCalledWith("/tmp/ccinput-");
			expect(writeFileMock).toHaveBeenCalledWith(expect.stringMatching(/\.ccinput-\d{14}\.md$/), "");
			expect(typeof result).toBe("string");
			expect(result).toMatch(/\.ccinput-\d{14}\.md$/);
		});

		test("should handle mkdtemp failure", async () => {
			const tmpdirMock = mock(() => "/tmp");
			mock.module("node:os", () => ({
				tmpdir: tmpdirMock,
			}));

			const joinMock = mock((...paths: string[]) => paths.join("/"));
			mock.module("node:path", () => ({
				join: joinMock,
			}));

			const mkdtempMock = mock(() => Promise.reject(new Error("Permission denied")));
			mock.module("node:fs/promises", () => ({
				mkdtemp: mkdtempMock,
				writeFile: mock(),
			}));

			await expect(createTempFile())
				.rejects.toThrow("Permission denied");
		});

		test("should handle writeFile failure", async () => {
			const tmpdirMock = mock(() => "/tmp");
			mock.module("node:os", () => ({
				tmpdir: tmpdirMock,
			}));

			const joinMock = mock((...paths: string[]) => paths.join("/"));
			mock.module("node:path", () => ({
				join: joinMock,
			}));

			const mkdtempMock = mock(() => Promise.resolve("/tmp/ccinput-abcdef"));
			const writeFileMock = mock(() => Promise.reject(new Error("Disk full")));
			mock.module("node:fs/promises", () => ({
				mkdtemp: mkdtempMock,
				writeFile: writeFileMock,
			}));

			await expect(createTempFile())
				.rejects.toThrow("Disk full");
		});
	});
});