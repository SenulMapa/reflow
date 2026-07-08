import { describe, expect, test } from "vitest";
import {
  initialState,
  appendMessage,
  startNewConversation,
  selectConversation,
  renameConversation,
  deleteConversation,
  activeMessages,
  conversationList,
  type ChatMessage,
} from "./model";

const msg = (id: string, role: ChatMessage["role"], content: string): ChatMessage => ({
  id, role, content, at: "2027-05-01T10:00:00.000Z",
});

describe("conversation history", () => {
  test("first message with no active conversation creates one titled from it", () => {
    const s = appendMessage(initialState("2027-04-26"), msg("1", "user", "Explain the R-formula"));
    expect(s.conversations).toHaveLength(1);
    expect(s.conversations[0]!.title).toBe("Explain the R-formula");
    expect(s.activeConversationId).toBe(s.conversations[0]!.id);
    expect(activeMessages(s)).toHaveLength(1);
  });

  test("subsequent messages append to the active conversation", () => {
    let s = appendMessage(initialState("2027-04-26"), msg("1", "user", "Hi"));
    s = appendMessage(s, msg("2", "assistant", "Hello — what are we revising?"));
    expect(s.conversations).toHaveLength(1);
    expect(activeMessages(s)).toHaveLength(2);
  });

  test("startNewConversation leaves the old thread intact and starts fresh", () => {
    let s = appendMessage(initialState("2027-04-26"), msg("1", "user", "First chat"));
    const firstId = s.activeConversationId;
    s = startNewConversation(s);
    expect(s.activeConversationId).toBeNull();
    s = appendMessage(s, msg("2", "user", "Second chat"));
    expect(s.conversations).toHaveLength(2);
    expect(s.activeConversationId).not.toBe(firstId);
  });

  test("a newly-touched conversation moves to the top of the list (MRU)", () => {
    let s = appendMessage(initialState("2027-04-26"), msg("1", "user", "Older"));
    const older = s.activeConversationId!;
    s = startNewConversation(s);
    s = appendMessage(s, msg("2", "user", "Newer"));
    expect(conversationList(s)[0]!.id).toBe(s.activeConversationId); // newest on top
    // re-selecting + messaging the older one floats it back up
    s = selectConversation(s, older);
    s = appendMessage(s, msg("3", "user", "back to older"));
    expect(conversationList(s)[0]!.id).toBe(older);
  });

  test("rename changes a conversation's title", () => {
    let s = appendMessage(initialState("2027-04-26"), msg("1", "user", "x"));
    const id = s.activeConversationId!;
    s = renameConversation(s, id, "Mechanics doubts");
    expect(conversationList(s)[0]!.title).toBe("Mechanics doubts");
  });

  test("delete removes a conversation and clears active when it was active", () => {
    let s = appendMessage(initialState("2027-04-26"), msg("1", "user", "x"));
    const id = s.activeConversationId!;
    s = deleteConversation(s, id);
    expect(s.conversations).toHaveLength(0);
    expect(s.activeConversationId).toBeNull();
  });
});
